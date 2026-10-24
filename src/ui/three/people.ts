// 3D people in a Roblox-like style: rounded blocky parts, a drawn face, chunky hair, and the game's clothes turned into
// shapes and colours. Children and Isabelle come from their saved Look; parents, Emily and helpers have fixed looks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import colours from '../../../public/art/colours.json' with { type: 'json' };
import { Act } from '../../game/catalog';
import { HAIR_COLOURS, ITEM, Kind, Look, SKIN_TONES, kindOf } from '../../game/looks';
import { EYE_COLOURS, Expr, Face, Mouth, drawFace } from './face';

export type Mood = 'happy' | 'laugh' | 'want' | 'cry' | 'asleep';
type TopType = 'tee' | 'hoodie' | 'jacket' | 'vest' | 'cardigan' | 'leotard' | 'shirt' | 'jumper' | 'dress' | 'onesie' | 'apron' | 'suit';
type BottomType = 'shorts' | 'skirt' | 'tutu' | 'trousers' | 'leggings' | 'none';
type Extra = { kind: string; colour: string; accent: string };
export type Spec = {
  kind: Kind; skin: string; hair: string; hairColour: string; face: Face;
  top: { type: TopType; colour: string; accent: string; print: string };
  bottom: { type: BottomType; colour: string; accent: string };
  shoes: string; extras: Extra[];
};

// ---------- colours ----------
const COL = colours as Record<string, string[]>;
/** Painted clothes are pale pastels with highlights; give their colour a bit more body for plastic-looking parts. */
function rich(hex: string, more = 1) {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.s = Math.min(1, hsl.s * (1.5 + 0.3 * more) + 0.08);
  hsl.l = hsl.l > 0.86 ? 0.86 - (hsl.l - 0.86) * 0.5 : hsl.l;
  return '#' + c.setHSL(hsl.h, hsl.s, hsl.l * 0.94).getHexString();
}
const itemCol = (id: string): [string, string] => { const c = COL[id] ?? ['#cccccc', '#999999']; return [rich(c[0]), rich(c[1] ?? c[0])]; };

// A fixed random for each person, so their face never changes between visits
function seeded(n: number) { let s = (n * 2654435761) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

export function defaultFace(seed: number, skin: number, hairColour: string, girl: boolean): Face {
  const r = seeded(seed + 7);
  const dark = skin >= 3;
  return {
    eyes: dark ? pick(r, ['brown', 'brown', 'brown', 'hazel']) : pick(r, ['brown', 'hazel', 'green', 'blue', 'blue', 'lightblue', 'grey']),
    eyeShape: pick(r, ['round', 'round', 'almond', 'sparkly']), eyeSize: 0.92 + r() * 0.16, eyeGap: 0.95 + r() * 0.1,
    lashes: girl ? pick(r, ['some', 'long']) : 'none', brows: pick(r, ['soft', 'soft', 'arched', 'straight', 'thick']),
    browColour: HAIR_COLOURS[hairColour] ?? '#4a2f20', browHeight: r() * 0.4 - 0.2, browTilt: r() * 0.4 - 0.2,
    nose: 'button', mouth: 'smile', freckles: skin <= 1 && r() < 0.25, blush: 0.35 + r() * 0.35,
  };
}

// ---------- clothes from the game's items ----------
const has = (name: string, ...w: string[]) => w.some((x) => name.toLowerCase().includes(x));
function topFrom(id: string | undefined): Spec['top'] {
  if (!id || !ITEM[id]) return { type: 'tee', colour: '#f2f2f2', accent: '#dddddd', print: '' };
  const n = ITEM[id].name, [colour, accent] = itemCol(id);
  const type: TopType = has(n, 'hoodie') ? 'hoodie' : has(n, 'jacket') ? 'jacket' : has(n, 'vest') ? 'vest' : has(n, 'cardigan') ? 'cardigan'
    : has(n, 'leotard') ? 'leotard' : has(n, 'shirt and', 'blouse', 'sailor') ? 'shirt' : has(n, 'jumper') ? 'jumper' : has(n, 'dress') ? 'dress' : 'tee';
  const print = (['star', 'heart', 'rainbow', 'stripy', 'spotty', 'lightning', 'sunflower', 'dino', 'rocket', 'unicorn', 'strawberry', 'football', 'sparkly', 'bow tie'] as const).find((p) => has(n, p)) ?? '';
  return { type, colour, accent, print };
}
function bottomFrom(id: string | undefined): Spec['bottom'] {
  if (!id || !ITEM[id]) return { type: 'trousers', colour: '#5d7fb5', accent: '#3d5f95' };
  const n = ITEM[id].name, [colour, accent] = itemCol(id);
  const type: BottomType = has(n, 'tutu') ? 'tutu' : has(n, 'skirt') ? 'skirt' : has(n, 'shorts') ? 'shorts' : has(n, 'leggings') ? 'leggings' : 'trousers';
  return { type, colour, accent };
}
function extraFrom(id: string | undefined): Extra[] {
  if (!id || !ITEM[id]) return [];
  const n = ITEM[id].name, [colour, accent] = itemCol(id);
  const kinds: [string, string[]][] = [
    ['crown', ['crown', 'tiara']], ['partyhat', ['party']], ['pirate', ['pirate']], ['helmet', ['helmet', 'hard hat']], ['beret', ['beret']],
    ['sunhat', ['sun hat', 'floppy']], ['beanie', ['beanie', 'bobble']], ['cap', ['cap']], ['bonnet', ['bonnet']], ['bearhat', ['bear hat']],
    ['ears', ['cat ears', 'bunny ears']], ['horn', ['unicorn horn']], ['flowers', ['flower', 'daisy']], ['bow', ['bow', 'butterfly']],
    ['band', ['headband']], ['sunglasses', ['sunglasses']], ['glasses', ['glasses']], ['wings', ['wings']], ['cape', ['cape']],
    ['necklace', ['necklace']], ['backpack', ['backpack']], ['dummy', ['dummy']],
  ];
  const k = kinds.find(([, w]) => has(n, ...w))?.[0];
  if (!k) return [];
  const out: Extra[] = [{ kind: k, colour, accent }];
  if (k === 'ears' && has(n, 'bunny')) out[0].kind = 'bunnyears';
  return out;
}

/** The 3D look for a child or Isabelle, from the game's saved look. */
export function specFromLook(look: Look, age: number | 'adult', seed: number, sex: 'boy' | 'girl' = 'girl'): Spec {
  const kind = kindOf(age), o = look.outfit;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0];
  const face = { ...defaultFace(seed, look.skin, look.hairColor, sex === 'girl'), ...((look.face ?? {}) as Partial<Face>) };
  let top = topFrom(o.top), bottom = bottomFrom(o.bottoms);
  if (kind === 'baby') {
    const id = o.suit, n = id && ITEM[id] ? ITEM[id].name : '', [colour, accent] = id ? itemCol(id) : ['#f4f4f4', '#dddddd'];
    top = { type: 'onesie', colour, accent, print: (['duck', 'stripy', 'spotty', 'dino', 'car', 'bear', 'bunny'] as const).find((p) => has(n, p)) ?? '' };
    bottom = { type: has(n, 'tutu') ? 'tutu' : 'none', colour, accent };
  }
  if (kind === 'adult') {
    const id = o.outfit, n = id && ITEM[id] ? ITEM[id].name : 'Pink dress', [colour, accent] = id ? itemCol(id) : ['#f6a5bf', '#e88aa8'];
    top = { type: has(n, 'dungarees') ? 'shirt' : 'dress', colour: has(n, 'dungarees') ? '#f6f2ec' : colour, accent, print: has(n, 'spotty', 'party') ? 'sparkly' : '' };
    bottom = has(n, 'dungarees') ? { type: 'trousers', colour, accent } : { type: 'skirt', colour, accent };
    if (has(n, 'dungarees')) top.print = 'dungarees';
  }
  if (top.type === 'dress' || top.type === 'leotard') bottom = { ...bottom, type: top.type === 'leotard' ? (bottom.type === 'tutu' ? 'tutu' : 'leggings') : 'skirt', colour: top.type === 'dress' ? top.colour : bottom.colour };
  const shoes = o.shoes ? itemCol(o.shoes)[0] : kind === 'baby' ? top.colour : '#f2f2f2';
  const extras = [o.head, o.glasses, o.extra, o.dummy].flatMap(extraFrom);
  return { kind, skin, hair: look.hair, hairColour: HAIR_COLOURS[look.hairColor] ?? '#4a2f20', face, top, bottom, shoes, extras };
}

/** Grown-ups who always look the same: parents, Emily, the helpers (after their paintings). */
const G = (skin: number, hair: string, hc: string, top: [TopType, string, string?], bottom: [BottomType, string], shoes: string, extras: Extra[] = [], girl = true, print = ''): Omit<Spec, 'face' | 'kind'> & { skinI: number; girl: boolean } =>
  ({ skinI: skin, skin: SKIN_TONES[skin], hair, hairColour: hc, top: { type: top[0], colour: top[1], accent: top[2] ?? top[1], print }, bottom: { type: bottom[0], colour: bottom[1], accent: bottom[1] }, shoes, extras, girl });
const GROWN: Record<string, ReturnType<typeof G>> = {
  'mum-1': G(0, 'ponytail', '#e8c46a', ['hoodie', '#3f7cc8'], ['trousers', '#6f8fbf'], '#3f6aa0'),
  'mum-2': G(4, 'curly', '#1d1512', ['dress', '#f5c932'], ['skirt', '#f5c932'], '#f0c020'),
  'mum-3': G(2, 'long', '#1d1512', ['dress', '#e07aa0'], ['leggings', '#c83e86'], '#e07aa0'),
  'mum-4': G(0, 'bob', '#9a6236', ['shirt', '#f3e8e0', '#d86a5a'], ['trousers', '#4f74a8'], '#d8463a', [], true, 'dungarees'),
  'mum-5': G(3, 'braids', '#2a1d17', ['jacket', '#6f96c8'], ['trousers', '#e08a34'], '#f2f2f2'),
  'gran-1': G(2, 'bun', '#c9c4c0', ['cardigan', '#9c6cc0'], ['skirt', '#8e8e98'], '#7d6a8a'),
  'dad-1': G(3, 'short', '#1d1512', ['jumper', '#4f8a3c'], ['trousers', '#c8b088'], '#5a3a26', [], false),
  'dad-2': G(0, 'short', '#c8662e', ['shirt', '#eadfcf', '#a88e6e'], ['trousers', '#4f6888'], '#6b4a30', [{ kind: 'glasses', colour: '#4a3a30', accent: '#4a3a30' }, { kind: 'beard', colour: '#c8662e', accent: '#c8662e' }], false),
  'dad-3': G(1, 'short', '#1d1512', ['suit', '#2f4470', '#f2f2f2'], ['trousers', '#2f4470'], '#222222', [], false),
  'dad-4': G(5, 'bald', '#1d1512', ['hoodie', '#d8403a'], ['trousers', '#a83a30'], '#f2f2f2', [], false),
  'dad-5': G(0, 'short', '#7b4c2c', ['tee', '#f3efe6', '#2a2a2a'], ['trousers', '#4f6fa8'], '#d8463a', [], false, 'band'),
  'grandad-1': G(0, 'short', '#e4e0dc', ['suit', '#7a6a3c', '#e8e0d0'], ['trousers', '#5a4630'], '#4a3426', [{ kind: 'moustache', colour: '#e4e0dc', accent: '#e4e0dc' }], false),
  emily: G(0, 'ponytail', '#e8c46a', ['tee', '#4cb860'], ['trousers', '#6f8fbf'], '#f2f2f2', [{ kind: 'lanyard', colour: '#3a6ad0', accent: '#ffffff' }]),
  art: G(0, 'bob', '#b07a40', ['apron', '#f4a0b8', '#f6d8de'], ['skirt', '#a07a70'], '#d8806a', [{ kind: 'glasses', colour: '#8a6a40', accent: '#8a6a40' }]),
  nap: G(0, 'bob', '#c9c4c0', ['apron', '#9c74c4', '#7a6a90'], ['trousers', '#8a7a70'], '#6a5a8a'),
  nappy: G(4, 'short', '#1d1512', ['apron', '#78aedc', '#e8e8f0'], ['trousers', '#4f6fa8'], '#f2f2f2', [{ kind: 'beard', colour: '#1d1512', accent: '#1d1512' }], false),
  play: G(1, 'short', '#1d1512', ['apron', '#4cb060', '#e8f0e8'], ['trousers', '#c8b088'], '#5a4a3a', [], false),
  snack: G(3, 'braids', '#2a1d17', ['apron', '#f0902c', '#d8603a'], ['skirt', '#e0703a'], '#d8603a'),
  story: G(3, 'bun', '#1d1512', ['apron', '#f5d040', '#d84a4a'], ['trousers', '#f5d040'], '#d84a4a'),
};
export function grownUpSpec(id: string): Spec {
  const g = GROWN[id] ?? GROWN['mum-1'];
  const seed = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  return { ...g, kind: 'adult', face: { ...defaultFace(seed, g.skinI, 'brown', g.girl), browColour: g.hairColour === '#c9c4c0' || g.hairColour === '#e4e0dc' ? '#9a948e' : g.hairColour } };
}

// ---------- shared shapes and materials ----------
const geos = new Map<string, THREE.BufferGeometry>();
const geo = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => { let g = geos.get(key); if (!g) { g = make(); geos.set(key, g); } return g as T; };
const rbg = (w: number, h: number, d: number, r: number) => geo(`rb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r.toFixed(3)}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
const mats = new Map<string, THREE.Material>();
const plastic = (c: string, rough = 0.45) => (mats.get(`p${c}${rough}`) ?? mats.set(`p${c}${rough}`, new THREE.MeshStandardMaterial({ color: c, roughness: rough })).get(`p${c}${rough}`)!) as THREE.MeshStandardMaterial;
const cloth = (c: string) => (mats.get(`c${c}`) ?? mats.set(`c${c}`, new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 })).get(`c${c}`)!) as THREE.MeshStandardMaterial;
function rb(w: number, h: number, d: number, r: number, m: THREE.Material) { return new THREE.Mesh(rbg(w, h, d, r), m); }
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };

/** A print on the front of a top, drawn once per kind and colour. */
const prints = new Map<string, THREE.Texture>();
function printTex(print: string, colour: string, accent: string): THREE.Texture | null {
  if (!print) return null;
  const key = `${print}${colour}${accent}`;
  if (prints.has(key)) return prints.get(key)!;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const star = (x: number, y: number, r: number) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
  const heart = (x: number, y: number, r: number) => { g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r); g.fill(); };
  const contrast = new THREE.Color(colour).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6 ? accent : '#ffffff';
  g.fillStyle = contrast; g.strokeStyle = contrast;
  switch (print) {
    case 'star': case 'sparkly': g.fillStyle = print === 'sparkly' ? '#fff6c0' : '#ffffff'; if (print === 'sparkly') for (let i = 0; i < 9; i++) star(20 + (i % 3) * 44, 22 + Math.floor(i / 3) * 42, 9); else star(64, 66, 40); break;
    case 'heart': g.fillStyle = '#ff5d8f'; heart(64, 60, 34); break;
    case 'rainbow': g.lineWidth = 9; ['#ff6b6b', '#ffb347', '#ffe66d', '#7bd389', '#6ab7ff'].forEach((col, i) => { g.strokeStyle = col; g.beginPath(); g.arc(64, 100, 52 - i * 10, Math.PI, 0); g.stroke(); }); break;
    case 'stripy': for (let y = 0; y < 128; y += 26) g.fillRect(0, y, 128, 12); break;
    case 'spotty': for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(16 + (i % 4) * 32 + (Math.floor(i / 4) % 2) * 16, 16 + Math.floor(i / 4) * 32, 7, 0, 7); g.fill(); } break;
    case 'lightning': g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(72, 14); g.lineTo(38, 70); g.lineTo(62, 70); g.lineTo(52, 114); g.lineTo(92, 52); g.lineTo(66, 52); g.closePath(); g.fill(); break;
    case 'sunflower': g.fillStyle = '#ffd23f'; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.ellipse(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 14, 8, a, 0, 7); g.fill(); } g.fillStyle = '#7a4a22'; g.beginPath(); g.arc(64, 64, 16, 0, 7); g.fill(); break;
    case 'football': g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.fillText('10', 64, 92); break;
    case 'band': g.fillStyle = '#2a2a2a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('BAND', 64, 50); g.beginPath(); g.arc(64, 86, 22, 0, 7); g.fill(); break;
    case 'bow tie': g.fillStyle = '#d83a3a'; g.beginPath(); g.moveTo(64, 24); g.lineTo(34, 8); g.lineTo(34, 40); g.closePath(); g.fill(); g.beginPath(); g.moveTo(64, 24); g.lineTo(94, 8); g.lineTo(94, 40); g.closePath(); g.fill(); break;
    case 'dungarees': return null;
    default: { // a picture: dino, rocket, unicorn, strawberry, duck, car, bear, bunny
      const pic: Record<string, string> = { dino: '🦕', rocket: '🚀', unicorn: '🦄', strawberry: '🍓', duck: '🐤', car: '🚗', bear: '🐻', bunny: '🐰' };
      g.font = '80px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pic[print] ?? '⭐', 64, 70);
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  prints.set(key, t);
  return t;
}

// ---------- hair ----------
type HeadBox = { w: number; h: number; d: number };
function buildHair(style: string, colour: string, H: HeadBox, kind: Kind) {
  const g = new THREE.Group(), m = plastic(colour, 0.6);
  const W = H.w, D = H.d, top = H.h / 2;
  if (style === 'bald') return g;
  if (style === 'sprout') { const t = new THREE.Mesh(geo('sprout', () => new THREE.TorusGeometry(0.06, 0.025, 8, 16, Math.PI * 1.5)), m); t.rotation.y = Math.PI / 2; g.add(at(t, 0, top + 0.05, 0)); return g; }
  const capH = style === 'wisps' ? 0.3 : 0.55;
  g.add(at(rb(W + 0.06, H.h * capH, D + 0.06, Math.min(0.2, H.h * capH / 2 - 0.01), m), 0, top - H.h * capH * 0.36, -0.01));
  if (style === 'wisps' || style === 'curls' && kind === 'baby') {
    if (style === 'curls') for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.add(at(new THREE.Mesh(geo('curl', () => new THREE.SphereGeometry(0.08, 12, 10)), m), Math.cos(a) * W * 0.36, top + 0.02, Math.sin(a) * D * 0.34)); }
    return g;
  }
  const fringe = () => at(rb(W + 0.04, H.h * 0.13, 0.12, 0.05, m), 0.04, top - H.h * 0.19, D / 2 - 0.02);
  const back = (len: number, wide = 1) => at(rb((W + 0.08) * wide, len, 0.2, 0.09, m), 0, top - 0.1 - len / 2, -D / 2 + 0.04);
  const sides = (len: number, depth = 0.75) => { for (const s of [-1, 1]) g.add(at(rb(0.13, len, D * depth, 0.06, m), s * (W / 2 + 0.03), top - len / 2 - H.h * 0.05, -0.03)); };
  switch (style) {
    case 'long': case 'wavy': g.add(fringe(), back(H.h * 1.45)); sides(H.h * 1.15);
      if (style === 'wavy') for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.add(at(new THREE.Mesh(geo('wave', () => new THREE.SphereGeometry(0.09, 12, 10)), m), s * (W / 2 + 0.05), top - H.h * (0.5 + i * 0.32), 0));
      break;
    case 'bob': g.add(fringe(), back(H.h * 0.85)); sides(H.h * 0.72, 0.85); break;
    case 'ponytail': { g.add(fringe()); const t = rb(0.2, H.h * 0.9, 0.2, 0.09, m); t.rotation.x = 0.35; g.add(at(t, 0, top - H.h * 0.55, -D / 2 - 0.12)); break; }
    case 'pigtails': g.add(fringe()); for (const s of [-1, 1]) { const b = rb(0.18, H.h * 0.7, 0.18, 0.08, m); b.rotation.z = s * 0.35; g.add(at(b, s * (W / 2 + 0.14), top - H.h * 0.55, -0.05)); } break;
    case 'braids': g.add(fringe()); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.add(at(new THREE.Mesh(geo('braid', () => new THREE.SphereGeometry(0.075, 12, 10)), m), s * (W / 2 - 0.02), top - H.h * (0.55 + i * 0.22), -D * 0.2)); break;
    case 'bun': g.add(fringe(), at(new THREE.Mesh(geo('bun', () => new THREE.SphereGeometry(0.17, 18, 14)), m), 0, top + 0.06, -D * 0.25)); break;
    case 'short': g.add(at(rb(W + 0.05, H.h * 0.3, 0.1, 0.05, m), 0, top - H.h * 0.16, D / 2 - 0.03), back(H.h * 0.45)); break;
    case 'spiky': for (let i = 0; i < 9; i++) {
      const sp = new THREE.Mesh(geo('spike', () => new THREE.ConeGeometry(0.11, 0.24, 4)), m), a = (i / 9) * Math.PI * 2;
      sp.position.set(Math.cos(a) * W * 0.3, top + 0.04, Math.sin(a) * D * 0.3 - 0.02); sp.rotation.set(Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5); g.add(sp);
    } g.add(at(rb(W + 0.05, H.h * 0.22, 0.1, 0.05, m), 0, top - H.h * 0.14, D / 2 - 0.02)); break;
    case 'curly': case 'curls': for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      g.add(at(new THREE.Mesh(geo('curly', () => new THREE.SphereGeometry(0.12, 12, 10)), m), Math.cos(a) * W * 0.52, top - 0.02 - (i % 3) * 0.12, Math.sin(a) * D * 0.5 - 0.03));
    } g.add(at(new THREE.Mesh(geo('curlytop', () => new THREE.SphereGeometry(0.3, 16, 12)), m), 0, top + 0.02, -0.04)); break;
  }
  return g;
}

// ---------- accessories ----------
function buildExtra(x: Extra, H: HeadBox, torso: THREE.Group, head: THREE.Group, torsoH: number, kind: Kind) {
  const m = plastic(x.colour, 0.4), m2 = plastic(x.accent, 0.4), top = H.h / 2, W = H.w, D = H.d;
  const sph = (r: number, mm: THREE.Material) => new THREE.Mesh(geo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), mm);
  const cyl = (r0: number, r1: number, h: number, mm: THREE.Material, seg = 24) => new THREE.Mesh(geo(`c${r0},${r1},${h},${seg}`, () => new THREE.CylinderGeometry(r0, r1, h, seg)), mm);
  switch (x.kind) {
    case 'cap': case 'helmet': {
      // a dome over the top of the head and a peak at the front
      const dome = new THREE.Mesh(geo('capdome', () => new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), m);
      dome.scale.set((W + 0.08), H.h * 0.62, (D + 0.08)); head.add(at(dome, 0, top - H.h * 0.24, 0));
      const peak = rb(W * 0.78, 0.035, 0.26, 0.015, x.kind === 'helmet' ? m : m2); head.add(at(peak, 0, top - H.h * 0.22, D / 2 + 0.1));
      if (x.kind === 'helmet') head.add(at(rb(0.1, 0.12, 0.04, 0.02, plastic('#f2c230')), 0, top + 0.1, D / 2 - 0.02));
      break;
    }
    case 'beanie': head.add(at(rb(W + 0.1, 0.3, D + 0.1, 0.14, m), 0, top + 0.02, 0), at(sph(0.09, m2), 0, top + 0.2, 0)); break;
    case 'sunhat': { head.add(at(cyl(W * 0.95, W * 0.95, 0.03, m, 32), 0, top - 0.02, 0), at(rb(W + 0.06, 0.2, D + 0.06, 0.09, m), 0, top + 0.08, 0)); break; }
    case 'crown': for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(geo('crownpt', () => new THREE.ConeGeometry(0.05, 0.14, 4)), plastic('#f2c230', 0.25)); c.position.set((i - 2) * W * 0.18, top + 0.1, D * 0.3); head.add(c); }
      head.add(at(rb(W * 0.85, 0.06, 0.06, 0.02, plastic('#f2c230', 0.25)), 0, top + 0.03, D * 0.3)); break;
    case 'partyhat': head.add(at(new THREE.Mesh(geo('party', () => new THREE.ConeGeometry(0.17, 0.42, 20)), m), 0, top + 0.2, 0)); break;
    case 'pirate': head.add(at(rb(W * 1.15, 0.2, D * 0.6, 0.08, plastic('#2a2a2a')), 0, top + 0.08, 0)); break;
    case 'beret': { const b = sph(0.36, m); b.scale.set(1, 0.32, 1); head.add(at(b, 0.05, top + 0.05, 0)); break; }
    case 'bonnet': head.add(at(rb(W + 0.12, H.h * 0.8, D * 0.85, 0.15, m), 0, top - H.h * 0.3, -0.08)); break;
    case 'bearhat': head.add(at(rb(W + 0.1, 0.28, D + 0.1, 0.13, m), 0, top + 0.02, 0)); for (const s of [-1, 1]) head.add(at(sph(0.09, m), s * W * 0.38, top + 0.17, 0)); break;
    case 'ears': for (const s of [-1, 1]) head.add(at(new THREE.Mesh(geo('catear', () => new THREE.ConeGeometry(0.09, 0.16, 4)), m), s * W * 0.3, top + 0.08, 0)); break;
    case 'bunnyears': for (const s of [-1, 1]) { const e = rb(0.08, 0.34, 0.05, 0.035, m); e.rotation.z = s * 0.15; head.add(at(e, s * W * 0.2, top + 0.17, 0)); } break;
    case 'horn': { const h = new THREE.Mesh(geo('horn', () => new THREE.ConeGeometry(0.05, 0.24, 12)), plastic('#f6d36a', 0.3)); h.rotation.x = 0.3; head.add(at(h, 0, top + 0.1, D * 0.3)); break; }
    case 'flowers': for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; head.add(at(sph(0.05, i % 2 ? m : plastic('#ffffff')), Math.sin(a) * W * 0.5, top + 0.01 - Math.abs(a) * 0.04, Math.cos(a) * D * 0.25)); } break;
    case 'bow': { const b = new THREE.Group(); for (const s of [-1, 1]) { const l = sph(0.11, m); l.scale.set(1.3, 0.85, 0.45); l.rotation.z = s * 0.4; b.add(at(l, s * 0.12, 0, 0)); } b.add(sph(0.05, m)); b.rotation.z = -0.3; head.add(at(b, W * 0.28, top + 0.03, D * 0.12)); break; }
    case 'band': head.add(at(rb(W + 0.08, 0.06, D * 0.5, 0.025, m), 0, top - 0.02, 0.06)); break;
    case 'glasses': case 'sunglasses': {
      const fm = plastic(x.kind === 'sunglasses' ? '#222222' : x.colour, 0.3);
      for (const s of [-1, 1]) {
        const ring = new THREE.Mesh(geo('lens', () => new THREE.TorusGeometry(0.075, 0.016, 8, 20)), fm); head.add(at(ring, s * W * 0.2, -H.h * 0.02, D / 2 + 0.03));
        if (x.kind === 'sunglasses') head.add(at(new THREE.Mesh(geo('lensfill', () => new THREE.CircleGeometry(0.07, 20)), plastic('#1a1a2a', 0.1)), s * W * 0.2, -H.h * 0.02, D / 2 + 0.032));
      }
      head.add(at(rb(0.08, 0.02, 0.02, 0.008, fm), 0, -H.h * 0.0, D / 2 + 0.03)); break;
    }
    case 'beard': head.add(at(rb(W * 0.82, H.h * 0.3, 0.06, 0.05, m), 0, -H.h * 0.36, D / 2 - 0.01)); break;
    case 'moustache': head.add(at(rb(W * 0.36, 0.05, 0.04, 0.02, m), 0, -H.h * 0.19, D / 2 + 0.015)); break;
    case 'wings': for (const s of [-1, 1]) { const wg = rb(0.36, 0.5, 0.02, 0.01, new THREE.MeshStandardMaterial({ color: x.colour, transparent: true, opacity: 0.6, roughness: 0.2 })); wg.rotation.set(0, s * 0.5, s * 0.4); torso.add(at(wg, s * 0.22, torsoH * 0.6, -0.3)); } break;
    case 'cape': { const c = rb(0.62, torsoH * 1.15, 0.03, 0.015, cloth(x.colour)); c.rotation.x = 0.12; torso.add(at(c, 0, torsoH * 0.32, -0.24)); break; }
    case 'necklace': for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + 0.7 * i / 8); torso.add(at(sph(0.025, i % 2 ? m : m2), Math.cos(a) * 0.16, torsoH * 0.82 - Math.sin(a) * 0.1, 0.21)); } break;
    case 'backpack': torso.add(at(rb(0.46, torsoH * 0.6, 0.18, 0.06, m), 0, torsoH * 0.5, -0.29)); break;
    case 'lanyard': torso.add(at(rb(0.1, 0.13, 0.015, 0.01, plastic('#ffffff')), 0, torsoH * 0.5, 0.215)); break;
    case 'dummy': { const d = new THREE.Group(); d.add(new THREE.Mesh(geo('dum', () => new THREE.CylinderGeometry(0.07, 0.07, 0.025, 20)), m)); const r = new THREE.Mesh(geo('dumring', () => new THREE.TorusGeometry(0.045, 0.012, 8, 16)), m2); r.position.z = 0.03; d.add(r); d.rotation.x = Math.PI / 2; head.add(at(d, 0, -H.h * 0.24, D / 2 + 0.02)); break; }
  }
  void kind;
}

// ---------- a person ----------
export type Person = {
  root: THREE.Group; spec: Spec; height: number; key: string;
  parts: { legs: THREE.Group[]; arms: THREE.Group[]; head: THREE.Group; body: THREE.Group; torso: THREE.Group };
  ex: Expr; setExpr(e: Partial<Expr>): void; dispose(): void;
};

const PROPS: Record<Kind, { leg: number; torso: number; head: number; width: number }> = {
  baby: { leg: 0.3, torso: 0.42, head: 0.8, width: 0.82 },
  kid: { leg: 0.56, torso: 0.56, head: 1, width: 1 },
  adult: { leg: 0.86, torso: 0.72, head: 0.95, width: 1.08 },
};

export function makePerson(spec: Spec, key = ''): Person {
  const P = PROPS[spec.kind], k = P.width;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = plastic(spec.skin, 0.5);
  const top = cloth(spec.top.colour), bottom = cloth(spec.bottom.colour), shoes = plastic(spec.shoes, 0.35);
  const bare = spec.bottom.type === 'skirt' || spec.bottom.type === 'tutu' || spec.bottom.type === 'none' && spec.top.type !== 'onesie';
  const onesie = spec.top.type === 'onesie';
  const legH = P.leg, torsoH = P.torso;
  // legs: thigh on a hip pivot, shin on a knee pivot
  const legs = [-1, 1].map((s) => {
    const hip = at(new THREE.Group(), s * 0.16 * k, legH, 0);
    const thighMat = onesie ? top : bare ? skin : bottom;
    const shinMat = onesie ? top : spec.bottom.type === 'shorts' || bare ? skin : bottom;
    hip.add(at(rb(0.28 * k, legH * 0.54, 0.3 * k, 0.07, thighMat), 0, -legH * 0.26, 0));
    const knee = at(new THREE.Group(), 0, -legH * 0.5, 0); hip.add(knee);
    knee.add(at(rb(0.26 * k, legH * 0.44, 0.28 * k, 0.07, shinMat), 0, -legH * 0.2, 0));
    knee.add(at(rb(0.3 * k, 0.12, 0.38 * k, 0.05, onesie && spec.kind === 'baby' ? top : shoes), 0, -legH * 0.44, 0.04 * k));
    body.add(hip); return hip;
  });
  const torso = at(new THREE.Group(), 0, legH, 0); body.add(torso);
  torso.add(at(rb(0.64 * k, 0.2, 0.38 * k, 0.08, bare ? top : bottom), 0, 0.06, 0));
  const chestMat = spec.top.type === 'suit' ? cloth(spec.top.colour) : top;
  torso.add(at(rb(0.68 * k, torsoH * 0.74, 0.4 * k, 0.12, chestMat), 0, torsoH * 0.55, 0));
  const pt = printTex(spec.top.print, spec.top.colour, spec.top.accent);
  if (pt) {
    const decal = new THREE.Mesh(geo('printplane', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshStandardMaterial({ map: pt, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
    decal.scale.setScalar(0.34 * k); torso.add(at(decal, 0, torsoH * 0.56, 0.202 * k));
  }
  const skirtLen = spec.kind === 'adult' ? 0.6 : 0.42;
  if (spec.bottom.type === 'skirt' || spec.bottom.type === 'tutu') {
    const tutu = spec.bottom.type === 'tutu';
    const sk = new THREE.Mesh(geo(`skirt${k}${tutu}${skirtLen}`, () => new THREE.CylinderGeometry(0.34 * k, (tutu ? 0.62 : 0.52) * k, tutu ? 0.16 : skirtLen, 28, 1, false)), cloth(spec.bottom.colour));
    torso.add(at(sk, 0, tutu ? 0.02 : 0.08 - skirtLen / 2 + 0.06, 0));
  }
  if (spec.top.type === 'dress' || spec.top.type === 'apron') torso.add(at(rb(0.7 * k, 0.06, 0.42 * k, 0.03, cloth(spec.top.accent)), 0, torsoH * 0.24, 0));
  if (spec.top.type === 'apron') torso.add(at(rb(0.5 * k, torsoH * 0.9, 0.03, 0.02, cloth(spec.top.colour)), 0, torsoH * 0.35, 0.215 * k));
  if (spec.top.print === 'dungarees' || spec.top.type === 'vest') {
    const dm = cloth(spec.top.print === 'dungarees' ? spec.bottom.colour : spec.top.colour);
    torso.add(at(rb(0.5 * k, torsoH * 0.42, 0.05, 0.02, dm), 0, torsoH * 0.4, 0.2 * k));
    for (const s of [-1, 1]) torso.add(at(rb(0.08 * k, torsoH * 0.62, 0.05, 0.02, dm), s * 0.2 * k, torsoH * 0.6, 0.205 * k));
  }
  if (spec.top.type === 'hoodie') torso.add(at(rb(0.58 * k, 0.2, 0.2, 0.08, top), 0, torsoH * 0.9, -0.21 * k));
  if (spec.top.type === 'jacket' || spec.top.type === 'cardigan' || spec.top.type === 'suit') {
    torso.add(at(rb(0.18 * k, torsoH * 0.7, 0.03, 0.01, cloth(spec.top.type === 'suit' ? spec.top.accent : spec.top.accent)), 0, torsoH * 0.56, 0.205 * k));
  }
  if (spec.top.type === 'shirt' && spec.top.print !== 'dungarees') torso.add(at(rb(0.3 * k, 0.07, 0.03, 0.015, cloth(spec.top.accent)), 0, torsoH * 0.88, 0.2 * k));
  // arms: sleeve on a shoulder pivot, forearm on an elbow pivot
  const longSleeve = ['hoodie', 'jacket', 'cardigan', 'jumper', 'suit', 'shirt', 'onesie'].includes(spec.top.type);
  const sleeveless = ['dress', 'vest', 'leotard'].includes(spec.top.type) && spec.kind !== 'adult' || spec.top.type === 'dress' && spec.kind === 'adult';
  const arms = [-1, 1].map((s) => {
    const sh = at(new THREE.Group(), s * 0.45 * k, torsoH * 0.84, 0);
    sh.add(at(rb(0.22 * k, torsoH * 0.46, 0.24 * k, 0.08, sleeveless ? skin : spec.top.type === 'apron' ? cloth(spec.top.accent) : top), 0, -torsoH * 0.2, 0));
    const el = at(new THREE.Group(), 0, -torsoH * 0.42, 0); sh.add(el);
    el.add(at(rb(0.2 * k, torsoH * 0.38, 0.22 * k, 0.08, longSleeve ? (spec.top.type === 'apron' ? cloth(spec.top.accent) : top) : skin), 0, -torsoH * 0.17, 0));
    el.add(at(rb(0.2 * k, 0.15, 0.22 * k, 0.07, skin), 0, -torsoH * 0.42, 0));
    torso.add(sh); return sh;
  });
  // head
  const hs = P.head;
  const Hd: HeadBox = { w: 0.66 * hs, h: 0.62 * hs, d: 0.6 * hs };
  const head = at(new THREE.Group(), 0, torsoH + 0.05 + Hd.h / 2, 0); torso.add(head);
  head.add(at(rb(0.2 * k, 0.1, 0.2 * k, 0.04, skin), 0, -Hd.h / 2 - 0.02, 0));
  head.add(rb(Hd.w, Hd.h, Hd.d, 0.2 * hs, skin));
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 448;
  const faceTex = new THREE.CanvasTexture(canvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
  head.add(at(new THREE.Mesh(geo(`face${hs}`, () => new THREE.PlaneGeometry(Hd.w * 0.86, Hd.w * 0.86 * 448 / 512)), faceMat), 0, -Hd.h * 0.06, Hd.d / 2 + 0.002));
  head.add(buildHair(spec.hair, spec.hairColour, Hd, spec.kind));
  for (const x of spec.extras) buildExtra(x, Hd, torso, head, torsoH, spec.kind);
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const ex: Expr = { blink: 0, asleep: false, mouth: null, worried: false, tears: false };
  const redraw = () => { drawFace(canvas.getContext('2d')!, spec.face, spec.skin, ex, spec.kind === 'baby', spec.kind === 'adult'); faceTex.needsUpdate = true; };
  redraw();
  const height = legH + torsoH + 0.05 + Hd.h + (spec.kind === 'baby' ? 0.02 : 0);
  return {
    root, spec, height, key, parts: { legs, arms, head, body, torso }, ex,
    setExpr(e) {
      let changed = false;
      for (const [k2, v] of Object.entries(e) as [keyof Expr, never][]) if (ex[k2] !== v) { (ex as Record<string, unknown>)[k2] = v; changed = true; }
      if (changed) redraw();
    },
    dispose() { faceTex.dispose(); faceMat.dispose(); },
  };
}

/** The face and tears for a mood. */
export function moodExpr(mood: Mood): Partial<Expr> {
  const m: Record<Mood, Partial<Expr>> = {
    happy: { asleep: false, mouth: null, worried: false, tears: false },
    laugh: { asleep: false, mouth: 'grin' as Mouth, worried: false, tears: false },
    want: { asleep: false, mouth: 'small' as Mouth, worried: true, tears: false },
    cry: { asleep: false, mouth: 'open' as Mouth, worried: true, tears: true },
    asleep: { asleep: true, mouth: 'small' as Mouth, worried: false, tears: false },
  };
  return m[mood];
}

/** Walking, standing, sitting (babies) or lying down, doing something, chatting, carrying or being carried. */
export function posePerson(p: Person, o: {
  walk: number; t: number; phase: number; sit?: boolean; lying?: boolean; act?: Act | null; talking?: boolean; holding?: boolean; held?: boolean;
}) {
  const { legs, arms, head, body } = p.parts;
  const sw = Math.sin(o.phase) * o.walk * 0.75, t = o.t, wave = Math.sin(t * 6 + o.phase);
  const knees = legs.map((l) => l.children[1] as THREE.Group), elbows = arms.map((a) => a.children[1] as THREE.Group);
  for (const k of knees) k.rotation.x = 0;
  for (const e of elbows) e.rotation.x = 0;
  body.rotation.set(0, 0, 0);
  if (o.sit) {
    for (const l of legs) l.rotation.x = -1.45;
    if (o.held) for (const k of knees) k.rotation.x = 1.2;
    body.position.y = -PROPS[p.spec.kind].leg * (o.held ? 0.55 : 0.86);
  } else {
    legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
    body.position.y = o.walk ? Math.abs(Math.cos(o.phase)) * 0.04 : 0;
  }
  // arms: swing when walking, then whatever they're doing
  let a0 = -sw + (o.sit ? -0.5 : 0), a1 = sw + (o.sit ? -0.5 : 0), z0 = -0.08, z1 = 0.08;
  switch (o.act) {
    case 'snack': case 'bottle': a0 = -2.2 + Math.max(0, Math.sin(t * 2.2)) * 0.6; elbows[0].rotation.x = -0.9; break; // hand to mouth
    case 'painting': a0 = -1.9 + wave * 0.35; z0 = -0.2 + Math.sin(t * 3) * 0.25; break; // brush strokes
    case 'story': a0 = a1 = -1.1; z0 = 0.25; z1 = -0.25; elbows[0].rotation.x = elbows[1].rotation.x = -0.6; head.rotation.x = 0.25; break; // a book in both hands
    case 'blocks': a0 = -1.0 + Math.max(0, wave) * 0.5; a1 = -1.0 + Math.max(0, -wave) * 0.5; break; // stacking
    case 'song': case 'play': a0 = -2.6 + wave * 0.4; a1 = -2.6 - wave * 0.4; body.position.y += Math.abs(Math.sin(t * 5)) * 0.08; body.rotation.y = Math.sin(t * 2.5) * 0.3; break; // dancing
    case 'outside': body.position.y += Math.abs(Math.sin(t * 4.5)) * 0.25; a0 = a1 = -2.8; break; // jumping
    case 'dressup': body.rotation.y = t * 2.2; z0 = -1.2; z1 = 1.2; break; // twirling in a crown
    case 'potty': break;
  }
  if (o.talking) { a0 = -0.6 + Math.sin(t * 4 + o.phase) * 0.35; z0 = -0.35; head.rotation.z = Math.sin(t * 2) * 0.08; }
  if (o.holding) { a0 = a1 = -1.25; elbows[0].rotation.x = elbows[1].rotation.x = -0.7; z0 = 0.2; z1 = -0.2; }
  if (o.held) { a0 = a1 = -0.9; z0 = 0.3; z1 = -0.3; }
  arms[0].rotation.x = a0; arms[1].rotation.x = a1; arms[0].rotation.z = z0; arms[1].rotation.z = z1;
  if (!o.lying && o.act !== 'story') { head.rotation.x = 0; head.rotation.y = o.walk || o.talking ? 0 : Math.sin(t * 0.5 + o.phase) * 0.25; }
  if (!o.lying && !p.ex.asleep) {
    const b = (t + o.phase) % 4.2;
    // chatting: the mouth opens and shuts as they talk
    p.setExpr({ blink: b < 0.1 ? 1 : 0, ...(o.talking ? { mouth: (Math.floor(t * 7) % 2 ? 'open' : 'smile') as Mouth } : {}) });
  }
}

export { EYE_COLOURS };
