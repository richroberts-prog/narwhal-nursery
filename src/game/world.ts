// The nursery that lasts between days: families, children, clothes, helpers, furniture, and how it grows.
import {
  CATS, Cat, DAILY, FURNITURE, FurnId, HAIR_COLOURS, HELPERS, HelperId, ITEM, ITEMS, KID_HAIR, MAX_CHILDREN, MAX_HELPERS,
  NAMES, PERSONALITIES, Personality, SKINS, SPECIAL, STARTER,
} from './catalog';

export type Rng = () => number;
export const pick = <T>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng() * a.length)];
export function shuffle<T>(rng: Rng, a: readonly T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export type Outfit = Record<Cat, string>;
export type Look = { skin: string; hair: string; hairColor: string; outfit: Outfit };
export type Child = Look & { id: number; name: string; age: number; pers: Personality; fam: number };
export type Family = { id: number; kids: number[]; mum: Look; dad: Look; visits: number; last?: { day: number; hearts: Record<number, number> } };
export type World = {
  v: 2; day: number; nextId: number; families: Family[]; children: Child[]; unlocked: string[];
  isabelle: Look; helpers: HelperId[]; furniture: FurnId[]; muted: boolean;
  /** Isabelle's own child, if she has one. */
  own?: number;
};

/** Isabelle's own child has family 0: comes every day, nobody picks them up, and grows a year a day. */
export const OWN = 0;
export const GROWN_UP = 16;
export const nursery = (w: World) => w.children.filter((c) => c.fam !== OWN);
export const ownChild = (w: World) => w.children.find((c) => c.id === w.own) ?? null;
export const ownIsHelper = (w: World) => (ownChild(w)?.age ?? 0) >= GROWN_UP;

export type NewChild = { name: string; age: number; pers: Personality; skin: string; hair: string; hairColor: string; outfit?: Outfit };
export function haveChild(w: World, c: NewChild, rng: Rng = Math.random): Child {
  if (ownChild(w)) return ownChild(w)!;
  const child: Child = { ...c, id: w.nextId++, fam: OWN, outfit: c.outfit ?? randomOutfit(rng, c.age) };
  w.children.push(child);
  w.own = child.id;
  return child;
}

const starter = (cat: Cat) => ITEMS[cat].slice(0, 6).map((i) => i.id);

export function randomOutfit(rng: Rng, age: number | 'adult'): Outfit {
  const o = {} as Outfit;
  for (const c of CATS) o[c] = pick(rng, starter(c));
  o.hat = rng() < 0.3 ? pick(rng, starter('hat')) : 'hat0';
  o.headband = rng() < 0.3 ? pick(rng, starter('headband')) : 'headband0';
  o.dummy = age !== 'adult' && age <= 2 && rng() < 0.6 ? pick(rng, starter('dummy').slice(1)) : 'dummy0';
  return o;
}

const adult = (rng: Rng, hair: string): Look => ({ skin: pick(rng, SKINS), hair, hairColor: pick(rng, HAIR_COLOURS), outfit: randomOutfit(rng, 'adult') });

export function newWorld(rng: Rng = Math.random): World {
  const w: World = {
    v: 2, day: 1, nextId: 1, families: [], children: [], unlocked: [...STARTER], helpers: [], furniture: [], muted: false,
    isabelle: { skin: SKINS[0], hair: 'long', hairColor: '#6b4226', outfit: { hat: 'hat0', headband: 'headband1', dummy: 'dummy0', top: 'top0', bottoms: 'bottoms1', shoes: 'shoes1' } },
  };
  addFamily(w, rng, 2);
  addFamily(w, rng, 1);
  return w;
}

/** A new family of 1 to 3 children, all different ages, never past the 22 children limit. */
export function addFamily(w: World, rng: Rng, size = 1 + Math.floor(rng() * 3)): Family | null {
  const room = MAX_CHILDREN - nursery(w).length;
  if (room <= 0) return null;
  const fam: Family = { id: w.nextId++, kids: [], mum: adult(rng, pick(rng, ['long', 'bun', 'curly'])), dad: adult(rng, pick(rng, ['dad', 'dad', 'curly'])), visits: 0 };
  const used = new Set(w.children.map((c) => c.name));
  const names = shuffle(rng, NAMES.filter((n) => !used.has(n)));
  const ages = shuffle(rng, [0, 1, 2, 3, 4]);
  for (let i = 0; i < Math.min(size, room); i++) {
    const age = ages[i];
    const child: Child = {
      id: w.nextId++, name: names[i] ?? `Baby ${w.nextId}`, age, fam: fam.id,
      pers: pick(rng, Object.keys(PERSONALITIES) as Personality[]),
      skin: pick(rng, [fam.mum.skin, fam.dad.skin]), hair: age === 0 ? 'tuft' : pick(rng, KID_HAIR),
      hairColor: pick(rng, [fam.mum.hairColor, fam.dad.hairColor]), outfit: randomOutfit(rng, age),
    };
    w.children.push(child);
    fam.kids.push(child.id);
  }
  w.families.push(fam);
  return fam;
}

const locked = (w: World, order: string[]) => order.filter((id) => !w.unlocked.includes(id));

/** Move to the next day: three new clothes, below 22 children a new family, and Isabelle's child a year older. */
export function nextDay(w: World, rng: Rng = Math.random) {
  w.day++;
  const clothes = locked(w, DAILY).slice(0, 3);
  w.unlocked.push(...clothes);
  const family = addFamily(w, rng);
  const own = ownChild(w);
  let birthday: Child | null = null;
  if (own && own.age < GROWN_UP) {
    own.age++;
    if (own.hair === 'tuft') own.hair = 'short';
    birthday = own;
  }
  return { clothes: clothes.map((id) => ITEM[id]), family, birthday };
}

export type Reward = { kind: 'helper'; id: HelperId } | { kind: 'furniture'; id: FurnId } | { kind: 'clothes'; ids: string[] };

/** Rewards start once all 22 children come; a good day is three in four children on 4 hearts or more. */
export function earnsReward(w: World, hearts: number[]): boolean {
  if (nursery(w).length < MAX_CHILDREN || !hearts.length) return false;
  return hearts.filter((h) => h >= 4).length / hearts.length >= 0.75;
}

export function rewardChoices(w: World, rng: Rng = Math.random): Reward[] {
  const pool: Reward[] = [];
  if (w.helpers.length < MAX_HELPERS) for (const id of Object.keys(HELPERS) as HelperId[]) if (!w.helpers.includes(id)) pool.push({ kind: 'helper', id });
  for (const id of Object.keys(FURNITURE) as FurnId[]) if (!w.furniture.includes(id)) pool.push({ kind: 'furniture', id });
  const clothes = [...locked(w, SPECIAL), ...locked(w, DAILY)].slice(0, 3);
  // Clothes are always on offer while any are left, so the choice never runs dry early.
  const rest = shuffle(rng, pool).slice(0, clothes.length ? 2 : 3);
  return clothes.length ? [...rest, { kind: 'clothes', ids: clothes }] : rest;
}

export function takeReward(w: World, r: Reward) {
  if (r.kind === 'helper' && w.helpers.length < MAX_HELPERS && !w.helpers.includes(r.id)) w.helpers.push(r.id);
  if (r.kind === 'furniture' && !w.furniture.includes(r.id)) w.furniture.push(r.id);
  if (r.kind === 'clothes') w.unlocked.push(...r.ids.filter((id) => !w.unlocked.includes(id)));
}

/** A dummy only shows on children aged 2 and under. */
export const showsDummy = (age: number | 'adult') => age !== 'adult' && age <= 2;

export const familyName = (w: World, f: Family) => {
  const n = f.kids.map((id) => w.children.find((c) => c.id === id)!.name);
  return n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};
