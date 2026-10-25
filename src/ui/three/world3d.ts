// The nursery in 3D, drawn under the game's tap layer. It is one building: the play room ('down') and the baby room
// ('up') side by side, the glass front with the door on the left, and the pavement outside where parents wait.
// The game still works in room pixels (1376 x 768) per room: each room has its own camera spot, every pixel on its
// floor maps to a place in 3D, so tap zones, walking spots and the rules don't change. The camera slides between rooms.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Act, Floor } from '../../game/catalog';
import { Bed, FRONT_DOOR, GLASS, ROOM_H, ROOM_W, Station } from '../room';
import * as F from './furniture';
import { Art, artKey, paint } from './paint';

const low = /Silk|KF[A-Z]{2,4}|Android [4-9]\b/.test(navigator.userAgent);

// ---------- cameras: one spot per room, the real camera slides between them ----------
const base = new THREE.PerspectiveCamera(30, ROOM_W / ROOM_H, 0.1, 120);
base.position.set(0, 3.25, 10.5);
base.lookAt(0, 1.5, 0);
base.updateMatrixWorld();
const ray = new THREE.Raycaster();
const ndc = (x: number, y: number) => new THREE.Vector2((x / ROOM_W) * 2 - 1, -(y / ROOM_H) * 2 + 1);
function hit(cam: THREE.Camera, x: number, y: number, h: number) {
  ray.setFromCamera(ndc(x, y), cam);
  const p = new THREE.Vector3();
  ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), p);
  return p;
}
const WALL_PX = 512; // where the back wall meets the floor, in room pixels
const back = hit(base, ROOM_W / 2, WALL_PX, 0).z;
const leftX = hit(base, 0, WALL_PX, 0).x, rightX = hit(base, ROOM_W, WALL_PX, 0).x;
/** How far right the baby room's camera spot is: its left edge meets the play room's right edge at the back wall. */
const OFF: Record<Floor, number> = { down: 0, up: rightX - leftX };
const cams: Record<Floor, THREE.PerspectiveCamera> = { down: base.clone(), up: base.clone() };
cams.up.position.x += OFF.up; cams.up.updateMatrixWorld();
const camera = base.clone();

/** Where a room pixel lands, in that room, on a level plane at height `h` (the floor by default). */
export function pointAt(x: number, y: number, h = 0, floor: Floor = 'down'): THREE.Vector3 { return hit(cams[floor], x, y, h); }
/** Room pixels per 3D unit, upright, at a spot seen from a room's camera. */
function pxPerUnit(p: THREE.Vector3, floor: Floor) {
  const a = p.clone().project(cams[floor]), b = p.clone().add(new THREE.Vector3(0, 1, 0)).project(cams[floor]);
  return ((b.y - a.y) / 2) * ROOM_H;
}
const glassX = pointAt(GLASS[0], GLASS[1]).x;
const archX = (rightX + OFF.up + leftX) / 2;
const babyRight = OFF.up + rightX + 0.3;

// ---------- scene ----------
let renderer: THREE.WebGLRenderer;
const scene = new THREE.Scene();
const building = new THREE.Group();
const furniture: Record<Floor, THREE.Group> = { down: new THREE.Group(), up: new THREE.Group() };
const peopleRoot = new THREE.Group();
const props = new THREE.Group();
scene.add(building, furniture.down, furniture.up, peopleRoot, props);
let view: Floor = 'down';

function wood() {
  return F.canvasTex(1024, 1024, (c, w, h) => {
    const rowH = 64;
    for (let y = 0; y < h; y += rowH) {
      let x = -((y / rowH) % 3) * 140;
      while (x < w) {
        const len = 260 + ((x * 7 + y * 3) % 200), l = 62 + ((x + y) % 8);
        c.fillStyle = `hsl(${30 + ((x + y) % 6)} 55% ${l}%)`; c.fillRect(x, y, len, rowH);
        c.fillStyle = '#9c6a3c'; c.fillRect(x, y, 3, rowH); x += len;
      }
      c.fillStyle = '#9c6a3c'; c.fillRect(0, y, w, 3);
    }
  });
}
const wallCols: Record<Floor, [string, string]> = { down: ['#ffe3cf', '#fbd2bd'], up: ['#d9c8f0', '#c6b1e6'] };
function wallpaper(up: boolean) {
  const [top, low] = wallCols[up ? 'up' : 'down'];
  return F.canvasTex(1024, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(1, low); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 26; i++) {
      const x = (i * 397) % w, y = (i * 211) % h;
      c.beginPath();
      if (up) for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, r = k % 2 ? 7 : 16; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      else c.arc(x, y, 9, 0, 7);
      c.fill();
    }
  });
}
const plane = (w: number, h: number, m: THREE.Material) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.receiveShadow = true; return p; };
/** Each room's wall pieces, so Isabelle can paint them. */
const walls: { up: boolean; mat: THREE.MeshStandardMaterial; repeat: number }[] = [];
const grassMat = new THREE.MeshStandardMaterial({ color: '#8fcf72', roughness: 1 });

function buildBuilding() {
  const H = 6.5, depth = 11, front = back + depth;
  // floors: wood indoors, pavement and grass outside
  const inW = babyRight - glassX;
  const fl = plane(inW, depth, new THREE.MeshStandardMaterial({ map: (() => { const t = wood(); t.repeat.set(inW / 5, depth / 5); return t; })(), roughness: 0.45 }));
  fl.rotation.x = -Math.PI / 2; fl.position.set((glassX + babyRight) / 2, 0, back + depth / 2); building.add(fl);
  const pave = F.canvasTex(256, 256, (c) => { c.fillStyle = '#d8d4cc'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#b8b2a8'; c.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); } });
  pave.repeat.set(4, 6);
  const pv = plane(8, depth + 4, new THREE.MeshStandardMaterial({ map: pave, roughness: 0.9 })); pv.rotation.x = -Math.PI / 2; pv.position.set(glassX - 4, -0.01, back + depth / 2); building.add(pv);
  const grass = plane(30, 30, grassMat); grass.rotation.x = -Math.PI / 2; grass.position.set(glassX - 10, -0.03, back - 6); building.add(grass);
  // walls: back wall per room, the baby room's right wall, a stub wall and an arch between the rooms
  const wallFor = (up: boolean, x0: number, x1: number) => {
    const t = wallpaper(up); t.repeat.set((x1 - x0) / 5, 1);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    walls.push({ up, mat: m, repeat: (x1 - x0) / 5 });
    const p = plane(x1 - x0, H, m); p.position.set((x0 + x1) / 2, H / 2, back); building.add(p);
    building.add(F.at(F.rbox(x1 - x0, 0.16, 0.05, 0.02, F.paint), (x0 + x1) / 2, 0.08, back + 0.025));
  };
  wallFor(false, glassX, archX); wallFor(true, archX, babyRight);
  const rwm = new THREE.MeshStandardMaterial({ map: (() => { const t = wallpaper(true); t.repeat.set(2, 1); return t; })(), roughness: 0.9 });
  walls.push({ up: true, mat: rwm, repeat: 2 });
  const rw = plane(depth, H, rwm);
  rw.rotation.y = -Math.PI / 2; rw.position.set(babyRight, H / 2, back + depth / 2); building.add(rw);
  const stub = F.rbox(0.3, H, 2.2, 0.05, F.mat('#f4ece4')); building.add(F.at(stub, archX, H / 2, back + 1.1));
  const beam = F.rbox(0.3, 0.5, depth - 2.2, 0.05, F.mat('#f4ece4')); building.add(F.at(beam, archX, 3.6, back + 2.2 + (depth - 2.2) / 2));
  const sign = new THREE.Group();
  const signTex = F.canvasTex(512, 128, (c) => { c.fillStyle = '#fff6fb'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#e8608f'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('👶 Baby room', 256, 68); });
  sign.add(F.rbox(1.9, 0.5, 0.06, 0.04, F.mat('#ffffff')), F.at(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })), 0, 0, 0.035));
  building.add(F.at(sign, archX, 3.1, back + 2.6));
  // the glass front wall with the door, seen side-on
  const glass = new THREE.MeshStandardMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.22, roughness: 0.05 });
  const doorZ = pointAt(FRONT_DOOR[0], FRONT_DOOR[1]).z;
  const pane = (z0: number, z1: number) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 3.2), glass); p.rotation.y = Math.PI / 2; p.position.set(glassX, 1.6, (z0 + z1) / 2); building.add(p); };
  pane(back, doorZ - 0.8); pane(doorZ + 0.8, front - 2);
  for (let z = back; z <= front - 2; z += 1.2) if (Math.abs(z - doorZ) > 0.85) building.add(F.at(F.rbox(0.12, 3.2, 0.1, 0.03, F.paint), glassX, 1.6, z));
  building.add(F.at(F.rbox(0.16, 0.18, front - 2 - back, 0.04, F.paint), glassX, 3.25, (back + front - 2) / 2));
  for (const s of [-1, 1]) building.add(F.at(F.rbox(0.18, 2.6, 0.14, 0.04, F.mat('#ff9eb5')), glassX, 1.3, doorZ + s * 0.8));
  building.add(F.at(F.rbox(0.2, 0.2, 1.8, 0.05, F.mat('#ff9eb5')), glassX, 2.65, doorZ));
  const mat = F.rbox(0.9, 0.03, 1.3, 0.01, F.mat('#7cc8ff')); building.add(F.at(mat, glassX + 0.6, 0.02, doorZ));
  // outside: a hedge, a tree, a bench and a lamp post
  const hedge = F.mat('#5fae55', { roughness: 0.95 });
  building.add(F.at(F.rbox(0.8, 1.1, depth + 6, 0.3, hedge), glassX - 7.6, 0.55, back + depth / 2));
  building.add(F.at(F.rbox(7, 1.1, 0.8, 0.3, hedge), glassX - 4, 0.55, back - 0.6));
  const tree = new THREE.Group(); tree.add(F.at(F.rbox(0.35, 2.4, 0.35, 0.08, F.mat('#8a5a34')), 0, 1.2, 0));
  for (const [x, y, z, r] of [[0, 3, 0, 1.1], [0.6, 2.6, 0.3, 0.8], [-0.6, 2.7, -0.2, 0.85]]) tree.add(F.at(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), F.mat('#6cbf5c', { roughness: 0.9 })), x, y, z));
  building.add(F.shade(F.at(tree, glassX - 5.8, 0, back + 1.4)));
  const bench = new THREE.Group(); bench.add(F.at(F.rbox(0.5, 0.08, 1.6, 0.03, F.mat('#c98c55')), 0, 0.5, 0), F.at(F.rbox(0.08, 0.5, 1.6, 0.03, F.mat('#c98c55')), -0.22, 0.8, 0));
  for (const s of [-1, 1]) bench.add(F.at(F.rbox(0.45, 0.5, 0.08, 0.02, F.mat('#4a4a55')), 0, 0.25, s * 0.7));
  building.add(F.shade(F.at(bench, glassX - 6.6, 0, pointAt(120, 700).z)));
  const lamp = new THREE.Group(); lamp.add(F.at(F.rbox(0.1, 3.2, 0.1, 0.04, F.mat('#3a3a48')), 0, 1.6, 0), F.at(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), F.mat('#fff4c8', { emissive: '#ffe08a', emissiveIntensity: 0.4 })), 0, 3.3, 0));
  building.add(F.shade(F.at(lamp, glassX - 1.2, 0, doorZ - 2.2)));
  // rugs, windows, the mobile over the cots
  for (const f of ['down', 'up'] as Floor[]) {
    const up = f === 'up';
    const rugTex = F.canvasTex(512, 512, (c) => {
      c.fillStyle = up ? '#f6e9f5' : '#eef7ff'; c.fillRect(0, 0, 512, 512); c.filter = 'blur(36px)';
      for (const [x, y, r, col] of [[150, 160, 130, '#ffb3cf'], [350, 150, 120, '#bde3ff'], [360, 350, 130, '#c9f0d8'], [160, 360, 130, '#e3c8ff'], [256, 256, 90, '#fff1b8']] as const) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    });
    const ra = pointAt(up ? 780 : 720, 680, 0, f);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2; rug.scale.set(1.5, 0.75, 1); rug.position.set(ra.x, 0.012, ra.z); rug.receiveShadow = true; building.add(rug);
    const sky = F.canvasTex(256, 200, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7cc4f2'); gr.addColorStop(1, '#d6efff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; for (const [x, y] of [[60, 70], [180, 110]]) { c.beginPath(); c.arc(x, y, 22, 0, 7); c.arc(x + 24, y - 8, 26, 0, 7); c.arc(x + 48, y, 20, 0, 7); c.fill(); } c.fillStyle = '#9fd38a'; c.beginPath(); c.ellipse(128, h + 30, 200, 70, 0, 0, 7); c.fill(); });
    const win = new THREE.Group();
    win.add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false })));
    for (const [w, h, x, y] of [[1.75, 0.1, 0, 0.6], [1.85, 0.1, 0, -0.6], [0.1, 1.2, -0.84, 0], [0.1, 1.2, 0.84, 0], [0.05, 1.1, 0, 0], [1.6, 0.05, 0, 0]]) win.add(F.at(F.rbox(w, h, 0.08, 0.02, F.paint), x, y, 0.03));
    building.add(F.at(win, pointAt(up ? 900 : 930, WALL_PX, 0, f).x, 3.0, back + 0.02));
  }
  const mob = new THREE.Group(), ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 8, 40), F.mat('#e7c36a', { metalness: 0.6, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; mob.add(ring);
  const starM = F.mat('#ffd54a', { roughness: 0.35, emissive: '#5a4200' }), starG = F.extrude(F.starShape(0.09), 0.03, 0.012);
  for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5, s = new THREE.Mesh(starG, starM); s.rotation.y = -a; mob.add(F.at(s, Math.cos(a) * 0.4, -0.35 - (i % 2) * 0.12, Math.sin(a) * 0.4)); }
  const mp = pointAt(340, 560, 0, 'up'); mob.position.set(mp.x, 3.1, mp.z); mob.name = 'mobile'; building.add(mob);
}
buildBuilding();

/** Paint each room's walls: [top, bottom] colours. */
export function setWalls(cols: Record<Floor, [string, string]>) {
  for (const f of ['down', 'up'] as Floor[]) {
    if (wallCols[f].join() === cols[f].join()) continue;
    wallCols[f] = cols[f];
    for (const wl of walls) if (wl.up === (f === 'up')) { wl.mat.map?.dispose(); const t = wallpaper(wl.up); t.repeat.set(wl.repeat, 1); wl.mat.map = t; wl.mat.needsUpdate = true; }
  }
}

/** Today's special-day decorations (or none). */
let decor: { id: string; g: THREE.Group } | null = null;
export function setDecor(id: string | null) {
  if ((decor?.id ?? null) === id) return;
  if (decor) scene.remove(decor.g);
  decor = id ? { id, g: F.decoration(id, (x, y, f) => pointAt(x, y, 0, f)) } : null;
  if (decor) scene.add(decor.g);
  grassMat.color.set(id === 'snow' ? '#f4f8ff' : '#8fcf72');
}

// ---------- furniture from the stations ----------
const beds = new Map<string, { pos: THREE.Vector3; len: number }>();
/** Each station's spot in 3D: where its furniture stands and the top a child can sit or lie on. */
const spots = new Map<string, { pos: THREE.Vector3; top: number; wall: boolean }>();
export function setStations(list: Station[]) {
  for (const f of ['down', 'up'] as Floor[]) furniture[f].clear();
  beds.clear(); spots.clear();
  for (const s of list) {
    const [x0, y0, x1, y1] = s.zone, cx = (x0 + x1) / 2, fl = s.floor;
    if (s.beds) { for (const b of s.beds) addCot(fl, b); continue; }
    if (s.kind === 'stairs') continue; // the archway is part of the building
    const onWall = y1 < WALL_PX + 40 || ['garden', 'potty', 'books', 'wardrobe'].includes(s.id);
    const at = onWall ? pointAt(cx, WALL_PX + 2, 0, fl) : pointAt(cx, y1, 0, fl);
    const ppu = pxPerUnit(at, fl);
    const w = Math.max(0.5, (x1 - x0) / ppu), h = Math.max(0.4, (y1 - y0) / ppu);
    let o: THREE.Object3D, top = 0.5;
    switch (s.id) {
      case 'desk': o = F.desk(w, Math.min(h, 1.25)); top = 1.2; break;
      case 'kitchen': o = F.kitchen(w, h); top = 1.1; break;
      case 'easel': o = F.easel(w, h); break;
      case 'books': o = F.bookshelf(w, 2.5); break;
      case 'piano': o = F.piano(w, h); break;
      case 'potty': o = F.doorway(w, 2.9, 'potty'); break;
      case 'garden': o = F.doorway(w, 3.1, 'garden'); break;
      case 'toys': o = F.blocks(w); break;
      case 'dress': o = F.dressUp(w); break;
      case 'change': o = F.changingTable(w, h); top = Math.min(h, 1.05) + 0.1; break;
      case 'milk': o = F.milk(w, h); break;
      case 'wardrobe': o = F.wardrobe(w * 1.1, 2.6); break;
      case 'chair': o = F.armchair(Math.min(w, 1.6)); o.rotation.y = -0.45; top = 0.62 * Math.min(w, 1.6) / 1.3; break;
      default: o = F.reward(s.id.replace(/^furn-/, ''), w, h);
    }
    o.position.copy(at);
    if (onWall) o.position.z = back + 0.4; else o.position.z -= 0.25;
    furniture[fl].add(F.shade(o));
    spots.set(s.id, { pos: o.position.clone(), top, wall: onWall });
  }
}
function addCot(floor: Floor, b: Bed) {
  const lay = pointAt(b.x, b.y, 0.62, floor);
  const len = Math.max(1.2, (b.length / pxPerUnit(lay, floor)) * 1.15);
  const c = F.cot(len, ['#9cc6ef', '#f7b9cf', '#bfe8c8', '#ffe08a'][b.id.charCodeAt(0) % 4]);
  c.position.set(lay.x, 0, lay.z);
  furniture[floor].add(c);
  beds.set(b.id, { pos: new THREE.Vector3(lay.x, c.userData.bedY as number, lay.z), len });
}

// ---------- people: the painted dolls, standing in the room as cut-outs facing the camera ----------
export type Entry = {
  key: string; art: Art; x: number; y: number;
  /** The doll's box in room pixels where they stand, as the tap layer has it: [width, height, feet offset]. */
  box: [number, number, number]; floor: Floor;
  bed?: string | null; floorNap?: boolean;
  /** Someone new walks in from here: a room pixel in a room (parents from the street, children from the door). */
  from?: { x: number; y: number; floor: Floor };
  /** What they're doing right now (a bouncy thing makes them bob), or who they're chatting to. */
  act?: Act | null; talkTo?: string | null;
  /** How fast they walk, in 3D units a second. */
  speed?: number;
};
type Live = { e: Entry; obj: THREE.Mesh; blob: THREE.Mesh; key: string; target: THREE.Vector3; size: [number, number, number]; phase: number; moving: number; seen: number };
const live = new Map<string, Live>();
const card = new THREE.PlaneGeometry(1, 1);
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(60,30,40,.35)'); gr.addColorStop(1, 'rgba(60,30,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
const textures = new Map<string, Promise<THREE.Texture>>();
function textureFor(a: Art) {
  const k = artKey(a);
  let t = textures.get(k);
  if (!t) {
    t = paint(a).then((c) => { const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; });
    textures.set(k, t);
  }
  return t;
}
let frame = 0;

/** Where they stand, and their size in 3D: [width, height, feet offset]. In bed, they lie on the mattress. */
function goal(e: Entry): { pos: THREE.Vector3; size: [number, number, number] } {
  if (e.bed && beds.has(e.bed)) {
    const b = beds.get(e.bed)!, w = b.len * 1.05;
    return { pos: b.pos.clone().add(new THREE.Vector3(0, -0.05, 0.12)), size: [w, w * (e.box[1] / e.box[0]), 0] };
  }
  const pos = pointAt(e.x, e.y, 0, e.floor), ppu = pxPerUnit(pos, e.floor);
  return { pos, size: [e.box[0] / ppu, e.box[1] / ppu, e.box[2] / ppu] };
}

export function sync(entries: Entry[]) {
  frame++;
  for (const e of entries) {
    let l = live.get(e.key);
    const g = goal(e);
    if (!l) {
      const obj = new THREE.Mesh(card, new THREE.MeshBasicMaterial({ alphaTest: 0.5, transparent: false, toneMapped: false, side: THREE.DoubleSide }));
      obj.visible = false;
      const blob = new THREE.Mesh(card, blobMat); blob.rotation.x = -Math.PI / 2;
      peopleRoot.add(obj, blob);
      l = { e, obj, blob, key: '', target: g.pos, size: g.size, phase: Math.random() * 6, moving: 0, seen: frame };
      obj.position.copy(e.from ? pointAt(e.from.x, e.from.y, 0, e.from.floor) : g.pos);
      live.set(e.key, l);
    }
    const k = artKey(e.art);
    if (l.key !== k) {
      l.key = k;
      const mine = l;
      void textureFor(e.art).then((t) => { if (mine.key !== k) return; const m = mine.obj.material as THREE.MeshBasicMaterial; m.map = t; m.needsUpdate = true; mine.obj.visible = true; });
    }
    l.e = e; l.target = g.pos; l.size = g.size; l.seen = frame;
    const lying = !!(e.bed && beds.has(e.bed)) || !!e.floorNap;
    if (lying !== !!l.obj.userData.lying) { l.obj.userData.lying = lying; l.obj.position.copy(g.pos); }
  }
  for (const [k, l] of live) if (l.seen !== frame) { peopleRoot.remove(l.obj, l.blob); (l.obj.material as THREE.Material).dispose(); live.delete(k); }
}

// ---------- Isabelle carries a child ----------
type Carry = { kid: string; stage: 'fetch' | 'carry'; t: number };
let carrying: Carry | null = null;
/** Isabelle walks to the child, picks them up and carries them to where the game now has them. */
export function carry(kidKey: string) { if (live.has(kidKey) && live.has('isabelle')) carrying = { kid: kidKey, stage: 'fetch', t: 0 }; }
export const isCarried = (key: string) => carrying?.kid === key;

// ---------- each frame ----------
const clock = new THREE.Clock();
const BOUNCY: Act[] = ['song', 'play', 'outside', 'dressup'];
function walkTo(l: Live, target: THREE.Vector3, dt: number, speed: number) {
  const o = l.obj.position;
  const d = target.clone().sub(o); d.y = 0;
  const dist = d.length();
  if (dist > 40) { o.x = target.x; o.z = target.z; return 0; }
  if (dist > 0.04) { o.addScaledVector(d.normalize(), Math.min(dist, speed * dt)); l.moving = Math.min(1, l.moving + dt * 6); }
  else l.moving = Math.max(0, l.moving - dt * 6);
  return dist;
}
/** Stand the picture up: its feet on the spot, facing the camera like the painting did. */
function place(l: Live, foot: THREE.Vector3, size: [number, number, number], lift: number, scale = 1) {
  const [w, h, feet] = size;
  l.obj.scale.set(w * scale, h * scale, 1);
  l.obj.quaternion.copy(camera.quaternion);
  l.obj.position.set(foot.x, foot.y + (h / 2 - feet) * scale + lift, foot.z);
  l.blob.position.set(foot.x, 0.015, foot.z);
  l.blob.scale.set(w * 0.75 * scale, w * 0.35 * scale, 1);
}

/** Tests can hold the room still to look at a moment. */
let frozen = false;
export const freeze = (on: boolean) => { frozen = on; };
/** Tests: where the carry has got to, and the carried child's picture height off the floor. */
export const carryState = () => carrying && { ...carrying, kidY: live.get(carrying.kid)?.obj.position.y, isaY: live.get('isabelle')?.obj.position.y };

function animate() {
  const dt = frozen ? (clock.getDelta(), 0) : Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  const isa = live.get('isabelle');
  const foot = new THREE.Vector3();
  for (const l of live.values()) {
    const { e } = l;
    if (carrying && l === live.get(carrying.kid) && carrying.stage === 'carry') continue; // placed with Isabelle below
    if (l.obj.userData.lying) {
      l.obj.scale.set(l.size[0], l.size[1], 1);
      l.obj.quaternion.copy(camera.quaternion);
      l.obj.position.copy(l.target).add(new THREE.Vector3(0, l.size[1] / 2, 0));
      l.blob.visible = false;
      continue;
    }
    l.blob.visible = true;
    const isIsabelle = e.key === 'isabelle';
    let target = l.target;
    if (isIsabelle && carrying?.stage === 'fetch') { const kid = live.get(carrying.kid); if (kid) target = kid.obj.position.clone().add(new THREE.Vector3(0.5, 0, 0.15)); }
    // walk on the floor: keep the foot point, not the picture's middle
    l.obj.position.y = 0;
    const dist = walkTo(l, target, dt, e.speed ?? (isIsabelle ? 4 : 2.6));
    foot.copy(l.obj.position).setY(0);
    if (isIsabelle && carrying) {
      carrying.t += dt;
      if (carrying.stage === 'fetch' && (dist < 0.1 || carrying.t > 4)) { carrying.stage = 'carry'; carrying.t = 0; }
      else if (carrying.stage === 'carry' && (dist < 0.1 || carrying.t > 8)) { const kid = live.get(carrying.kid); if (kid) kid.obj.position.copy(kid.target); carrying = null; }
    }
    l.phase += dt * (l.moving > 0.1 ? 10 : 2);
    // a hop when walking, a bob when dancing or chatting, like the painted game
    const busy = dist <= 0.04 ? e.act ?? null : null;
    const hop = l.moving > 0.1 ? Math.abs(Math.sin(l.phase)) * 0.06 : busy && BOUNCY.includes(busy) ? Math.abs(Math.sin(t * 5 + l.phase)) * 0.12 : e.talkTo ? Math.abs(Math.sin(t * 7)) * 0.025 : 0;
    place(l, foot, l.size, hop);
    l.obj.userData.foot = foot.clone();
  }
  // a carried child sits in Isabelle's arms, in front of her, a little smaller
  if (carrying && isa) {
    const kid = live.get(carrying.kid);
    if (kid && carrying.stage === 'carry') {
      const f = (isa.obj.userData.foot as THREE.Vector3 | undefined) ?? isa.obj.position;
      const hold = new THREE.Vector3(f.x + 0.05, 0, f.z + 0.25);
      kid.obj.position.set(hold.x, 0, hold.z);
      place(kid, hold, kid.size, isa.size[1] * 0.3, 0.8);
      kid.blob.visible = false;
    } else if (!kid) carrying = null;
  }
  const mob = building.getObjectByName('mobile'); if (mob) mob.rotation.y += dt * 0.25;
  // slide the camera to the room on show
  camera.position.x += (OFF[view] - camera.position.x) * Math.min(1, dt * 4);
  renderer.render(scene, camera);
}

export function setView(f: Floor) { view = f; }

// ---------- start ----------
export function mount(container: HTMLElement) {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'room3d';
  container.prepend(renderer.domElement);
  const size = () => { const r = container.getBoundingClientRect(); renderer.setSize(ROOM_W, ROOM_H, false); renderer.setPixelRatio(Math.min(devicePixelRatio * (r.width / ROOM_W || 1), low ? 1 : 1.75)); };
  size(); window.addEventListener('resize', size);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.background = new THREE.Color('#bfe3f5');
  scene.add(new THREE.HemisphereLight('#efe6ff', '#d9a777', 1.1));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.3);
  sun.position.set(-5, 10, 8); sun.target.position.set(0, 0, back + 2);
  sun.castShadow = true; sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  // the sun's shadows follow the camera to whichever room is on show
  const follow = () => { requestAnimationFrame(follow); sun.position.x = camera.position.x - 5; sun.target.position.x = camera.position.x; };
  follow();
  const loop = () => { requestAnimationFrame(loop); if (!document.hidden) animate(); };
  loop();
}
