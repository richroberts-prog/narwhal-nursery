// The nursery in 3D, drawn under the game's tap layer. It is one building: the play room ('down') and the baby room
// ('up') side by side, the glass front with the door on the left, and the pavement outside where parents wait.
// The game still works in room pixels (1376 x 768) per room: each room has its own camera spot, every pixel on its
// floor maps to a place in 3D, so tap zones, walking spots and the rules don't change. The camera slides between rooms.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Act, Floor } from '../../game/catalog';
import { Bed, FRONT_DOOR, GLASS, ROOM_H, ROOM_W, Station } from '../room';
import * as F from './furniture';
import { Mood, Person, Spec, makePerson, moodExpr, posePerson } from './people';

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
function wallpaper(up: boolean) {
  return F.canvasTex(1024, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, up ? '#d9c8f0' : '#ffe3cf'); gr.addColorStop(1, up ? '#c6b1e6' : '#fbd2bd'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
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

function buildBuilding() {
  const H = 6.5, depth = 11, front = back + depth;
  // floors: wood indoors, pavement and grass outside
  const inW = babyRight - glassX;
  const fl = plane(inW, depth, new THREE.MeshStandardMaterial({ map: (() => { const t = wood(); t.repeat.set(inW / 5, depth / 5); return t; })(), roughness: 0.45 }));
  fl.rotation.x = -Math.PI / 2; fl.position.set((glassX + babyRight) / 2, 0, back + depth / 2); building.add(fl);
  const pave = F.canvasTex(256, 256, (c) => { c.fillStyle = '#d8d4cc'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#b8b2a8'; c.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); } });
  pave.repeat.set(4, 6);
  const pv = plane(8, depth + 4, new THREE.MeshStandardMaterial({ map: pave, roughness: 0.9 })); pv.rotation.x = -Math.PI / 2; pv.position.set(glassX - 4, -0.01, back + depth / 2); building.add(pv);
  const grass = plane(30, 30, new THREE.MeshStandardMaterial({ color: '#8fcf72', roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.position.set(glassX - 10, -0.03, back - 6); building.add(grass);
  // walls: back wall per room, the baby room's right wall, a stub wall and an arch between the rooms
  const wallFor = (up: boolean, x0: number, x1: number) => {
    const t = wallpaper(up); t.repeat.set((x1 - x0) / 5, 1);
    const p = plane(x1 - x0, H, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); p.position.set((x0 + x1) / 2, H / 2, back); building.add(p);
    building.add(F.at(F.rbox(x1 - x0, 0.16, 0.05, 0.02, F.paint), (x0 + x1) / 2, 0.08, back + 0.025));
  };
  wallFor(false, glassX, archX); wallFor(true, archX, babyRight);
  const rw = plane(depth, H, new THREE.MeshStandardMaterial({ map: (() => { const t = wallpaper(true); t.repeat.set(2, 1); return t; })(), roughness: 0.9 }));
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

// ---------- props children hold while doing things ----------
const propMat = (c: string) => F.mat(c, { roughness: 0.4 });
const PROPS: Partial<Record<Act, () => THREE.Object3D>> = {
  snack: () => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), propMat('#c98a4a')); c.rotation.x = Math.PI / 2; g.add(c); for (let i = 0; i < 4; i++) g.add(F.at(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), propMat('#5a3418')), Math.cos(i * 1.6) * 0.05, Math.sin(i * 1.6) * 0.05, 0.02)); return g; },
  painting: () => { const g = new THREE.Group(); g.add(F.at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), propMat('#e7c36a')), 0, 0.12, 0)); g.add(F.at(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), propMat('#ff5d8f')), 0, 0.3, 0)); return g; },
  story: () => { const g = new THREE.Group(); for (const s of [-1, 1]) { const p = F.rbox(0.22, 0.3, 0.03, 0.01, propMat(s < 0 ? '#5aa0f0' : '#ffffff')); p.rotation.y = s * 0.4; g.add(F.at(p, s * 0.1, 0, 0)); } return g; },
  blocks: () => F.rbox(0.18, 0.18, 0.18, 0.03, propMat(['#ff8fab', '#7cc8ff', '#ffd166'][Math.floor(Math.random() * 3)])),
  bottle: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 12), propMat('#fffaf0'))); g.add(F.at(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 10), propMat('#ffd6a0')), 0, 0.15, 0)); return g; },
  outside: () => new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), propMat('#ff6b6b')),
  play: () => new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), propMat('#ffd23f')),
  dressup: () => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), propMat('#f2c230')); c.position.set(Math.cos(i * 1.256) * 0.16, 0.07, Math.sin(i * 1.256) * 0.16); g.add(c); } g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 18), propMat('#f2c230'))); return g; },
};

// ---------- people ----------
export type Entry = {
  key: string; spec: () => Spec; specKey: string; x: number; y: number; hPx: number; floor: Floor; mood: Mood;
  bed?: string | null; floorNap?: boolean; sit?: boolean;
  /** Someone new walks in from here: a room pixel in a room (parents from the street, children from the door). */
  from?: { x: number; y: number; floor: Floor };
  /** What they're doing right now, and at which station. */
  act?: Act | null; at?: string;
  /** The person they're chatting to. */
  talkTo?: string | null;
  /** How fast they walk, in 3D units a second. */
  speed?: number;
};
type Live = {
  p: Person; e: Entry; target: THREE.Vector3; scale: number; phase: number; moving: number; seen: number;
  prop: THREE.Object3D | null; propAct: Act | null;
};
const live = new Map<string, Live>();
const SLIM = 0.84;
let frame = 0;

function goal(e: Entry): { pos: THREE.Vector3; scale: number } {
  if (e.bed && beds.has(e.bed)) { const b = beds.get(e.bed)!; return { pos: b.pos.clone(), scale: b.len * 0.78 }; }
  const pos = pointAt(e.x, e.y, 0, e.floor);
  return { pos, scale: e.hPx / pxPerUnit(pos, e.floor) };
}

export function sync(entries: Entry[]) {
  frame++;
  for (const e of entries) {
    let l = live.get(e.key);
    if (l && l.e.specKey !== e.specKey) { peopleRoot.remove(l.p.root); l.p.dispose(); dropProp(l); live.delete(e.key); l = undefined; }
    const g = goal(e);
    if (!l) {
      const p = makePerson(e.spec(), e.key);
      peopleRoot.add(p.root);
      l = { p, e, target: g.pos, scale: g.scale, phase: Math.random() * 6, moving: 0, seen: frame, prop: null, propAct: null };
      p.root.position.copy(e.from ? pointAt(e.from.x, e.from.y, 0, e.from.floor) : g.pos);
      p.root.scale.set((g.scale / p.height) * SLIM, g.scale / p.height, (g.scale / p.height) * SLIM);
      live.set(e.key, l);
    }
    l.e = e; l.target = g.pos; l.scale = g.scale; l.seen = frame;
    if (!e.talkTo) l.p.setExpr(moodExpr(e.mood));
    const lying = !!(e.bed && beds.has(e.bed)) || !!e.floorNap;
    if (lying !== !!l.p.root.userData.lying) { l.p.root.userData.lying = lying; l.p.root.position.copy(g.pos); }
  }
  for (const [k, l] of live) if (l.seen !== frame) { peopleRoot.remove(l.p.root); l.p.dispose(); dropProp(l); live.delete(k); }
}
function dropProp(l: Live) { if (l.prop) { l.prop.removeFromParent(); l.prop = null; l.propAct = null; } }

// ---------- Isabelle carries a child ----------
type Carry = { kid: string; stage: 'fetch' | 'carry'; t: number };
let carrying: Carry | null = null;
/** Isabelle walks to the child, picks them up and carries them to where the game now has them. */
export function carry(kidKey: string) { if (live.has(kidKey) && live.has('isabelle')) carrying = { kid: kidKey, stage: 'fetch', t: 0 }; }
export const isCarried = (key: string) => carrying?.kid === key;

// ---------- each frame ----------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
function walkTo(l: Live, target: THREE.Vector3, dt: number, speed: number) {
  const root = l.p.root;
  const d = target.clone().sub(root.position); d.y = 0;
  const dist = d.length();
  if (dist > 40) { root.position.copy(target); return 0; }
  if (dist > 0.04) {
    root.position.addScaledVector(d.normalize(), Math.min(dist, speed * dt));
    l.moving = Math.min(1, l.moving + dt * 6);
    turnTo(root, Math.atan2(d.x, d.z), dt * 10);
  } else l.moving = Math.max(0, l.moving - dt * 6);
  return dist;
}
function turnTo(o: THREE.Object3D, want: number, k: number) {
  let diff = want - o.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  o.rotation.y += diff * Math.min(1, k);
}
function setScale(l: Live) { const s = l.scale / l.p.height; l.p.root.scale.set(s * SLIM, s, s * SLIM); }

function holdProp(l: Live, act: Act | null | undefined) {
  if (l.propAct === (act ?? null)) return;
  dropProp(l);
  const make = act ? PROPS[act] : undefined;
  if (!make) return;
  const o = make(); l.prop = o; l.propAct = act!;
  o.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  if (act === 'dressup') { l.p.parts.head.add(F.at(o, 0, 0.42, 0)); return; }
  // in the right hand
  const hand = l.p.parts.arms[0].children[1] as THREE.Group;
  hand.add(F.at(o, 0, -l.p.parts.torso.position.y * 0.0 - 0.32, 0.12));
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  const isa = live.get('isabelle');
  for (const l of live.values()) {
    const { p, e } = l, root = p.root;
    setScale(l);
    const lying = !!root.userData.lying;
    const s = l.scale / p.height;
    if (carrying && isa && l === live.get(carrying.kid)) continue; // placed with Isabelle below
    if (lying) {
      holdProp(l, null);
      root.scale.setScalar(s);
      root.position.copy(l.target);
      root.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); // on their back, head towards the pillow, face up
      root.position.x += (p.height * s) / 2 - 0.05;
      root.position.y += 0.18 * s;
      posePerson(p, { walk: 0, t, phase: l.phase, lying: true });
      continue;
    }
    root.rotation.x = 0; root.rotation.z = 0;
    const isIsabelle = e.key === 'isabelle';
    let target = l.target;
    if (isIsabelle && carrying?.stage === 'fetch') { const kid = live.get(carrying.kid); if (kid) target = kid.p.root.position.clone().add(new THREE.Vector3(0.45, 0, 0.2)); }
    const speed = e.speed ?? (isIsabelle ? 5.5 : 2.8);
    const dist = walkTo(l, target, dt, speed);
    if (isIsabelle && carrying) {
      carrying.t += dt;
      if (carrying.stage === 'fetch' && (dist < 0.1 || carrying.t > 4)) { carrying.stage = 'carry'; carrying.t = 0; }
      else if (carrying.stage === 'carry' && (dist < 0.1 || carrying.t > 8)) { const kid = live.get(carrying.kid); if (kid) kid.p.root.position.copy(kid.target); carrying = null; }
    }
    // standing still: face the room, the thing they're doing, or the friend they're chatting to
    const sp = e.at ? spots.get(e.at) : undefined;
    const friend = e.talkTo ? live.get(e.talkTo) : undefined;
    if (dist <= 0.04) {
      if (friend) turnTo(root, Math.atan2(friend.p.root.position.x - root.position.x, friend.p.root.position.z - root.position.z), dt * 6);
      else if (e.act && sp && ['painting', 'story', 'song', 'snack', 'potty', 'outside', 'bottle'].includes(e.act) && sp.wall) turnTo(root, Math.PI + (sp.pos.x - root.position.x) * 0.15, dt * 5);
      else turnTo(root, 0, dt * 3);
    }
    const busy = dist <= 0.04 ? e.act ?? null : null;
    holdProp(l, busy);
    l.phase += dt * (l.moving > 0.1 ? 11 : 2);
    posePerson(p, { walk: l.moving, t, phase: l.phase, sit: (e.sit || busy === 'story' || busy === 'blocks') && l.moving < 0.1, act: busy, talking: !!friend && dist <= 0.04, holding: isIsabelle && carrying?.stage === 'carry' });
    if (busy === 'cuddle' && sp) { root.position.lerp(tmp.copy(sp.pos).setY(sp.top), Math.min(1, dt * 4)); root.rotation.y = -0.45; }
    if (busy === 'nappy' && sp) { root.position.copy(sp.pos).setY(sp.top); root.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); }
  }
  // a carried child sits in Isabelle's arms
  if (carrying && isa) {
    const kid = live.get(carrying.kid);
    if (kid) {
      const r = kid.p.root;
      if (carrying.stage === 'carry') {
        const fwd = new THREE.Vector3(Math.sin(isa.p.root.rotation.y), 0, Math.cos(isa.p.root.rotation.y));
        r.position.copy(isa.p.root.position).addScaledVector(fwd, 0.32).add(new THREE.Vector3(0, isa.scale * 0.42, 0));
        r.rotation.set(0, isa.p.root.rotation.y, 0);
        posePerson(kid.p, { walk: 0, t, phase: kid.phase, sit: true, held: true });
      } else posePerson(kid.p, { walk: 0, t, phase: kid.phase, sit: kid.e.sit });
      setScale(kid);
    } else carrying = null;
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

// ---------- still pictures of people for menus ----------
let snap: { r: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera } | null = null;
const shots = new Map<string, string>();
/** A picture of a person (full length), as an image URL, cached. */
export function portrait(spec: () => Spec, key: string, mood: Mood = 'happy'): string {
  const k = `${key}|${mood}`;
  const got = shots.get(k);
  if (got) return got;
  if (!snap) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(240, 400, false);
    r.toneMapping = THREE.NeutralToneMapping;
    const s = new THREE.Scene();
    s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.6;
    s.add(new THREE.HemisphereLight('#f4eeff', '#e8c8a8', 1.3));
    const key2 = new THREE.DirectionalLight('#fff4e4', 2.2); key2.position.set(-2, 4, 6); s.add(key2);
    snap = { r, scene: s, cam: new THREE.PerspectiveCamera(22, 240 / 400, 0.1, 50) };
  }
  const p = makePerson(spec());
  p.setExpr(moodExpr(mood));
  posePerson(p, { walk: 0, t: 0, phase: 1.3 });
  p.parts.head.rotation.y = 0.12;
  p.root.rotation.y = 0.25;
  snap.scene.add(p.root);
  const h = p.height + 0.2;
  snap.cam.position.set(0, h / 2, h / 2 / Math.tan((22 * Math.PI) / 360) + 0.6);
  snap.cam.lookAt(0, h / 2 - 0.02, 0);
  snap.r.render(snap.scene, snap.cam);
  const url = snap.r.domElement.toDataURL('image/png');
  snap.scene.remove(p.root); p.dispose();
  shots.set(k, url);
  return url;
}
