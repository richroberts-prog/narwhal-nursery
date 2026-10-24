// The nursery that lasts between days: families, children, clothes, helpers, furniture, and how it grows.
import { FURNITURE, FurnId, HELPERS, HelperId, MAX_CHILDREN, MAX_HELPERS, NAMES, PERSONALITIES, Personality } from './catalog';
import { ITEM, ITEMS, Item, Look, STARTER, kindOf, randomLook, regrow } from './looks';

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

export type Child = Look & { id: number; name: string; age: number; pers: Personality; fam: number };
/** Painted grown-ups (public/art/parents) and the skin tone (0-5) their children are painted with. */
export const PARENTS = {
  mums: { 'mum-1': 0, 'mum-2': 4, 'gran-1': 2, 'mum-3': 2, 'mum-4': 0, 'mum-5': 3 },
  dads: { 'dad-1': 3, 'dad-2': 0, 'dad-3': 1, 'dad-4': 5, 'grandad-1': 0, 'dad-5': 1 },
} as const;
type Mum = keyof typeof PARENTS.mums;
type Dad = keyof typeof PARENTS.dads;

/** Parents who look alike: a dad within one skin tone of the mum. */
const dadsFor = (mum: Mum) => (Object.keys(PARENTS.dads) as Dad[]).filter((d) => Math.abs(PARENTS.dads[d] - PARENTS.mums[mum]) <= 1);
/** Children take a skin tone from between their parents' tones. */
export function familyTones(mum: string, dad: string): number[] {
  const a = PARENTS.mums[mum as Mum];
  const b = PARENTS.dads[dad as Dad];
  return Array.from({ length: Math.abs(a - b) + 1 }, (_, i) => Math.min(a, b) + i);
}

/** A saved nursery from before families were matched: give each mum a dad who looks like her, and each child a tone between them. */
export function matchFamilies(w: World, rng: Rng = Math.random) {
  for (const f of w.families) {
    if (!dadsFor(f.mum as Mum).includes(f.dad as Dad)) f.dad = pick(rng, dadsFor(f.mum as Mum));
    const tones = familyTones(f.mum, f.dad);
    for (const id of f.kids) {
      const c = w.children.find((x) => x.id === id)!;
      if (!tones.includes(c.skin)) c.skin = tones.reduce((best, t) => (Math.abs(t - c.skin) < Math.abs(best - c.skin) ? t : best));
    }
  }
}

export type Family = { id: number; kids: number[]; mum: string; dad: string; visits: number; last?: { day: number; hearts: Record<number, number> } };
export type World = {
  v: 3; day: number; nextId: number; families: Family[]; children: Child[]; unlocked: string[];
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

export type NewChild = Look & { name: string; age: number; pers: Personality };
export function haveChild(w: World, c: NewChild): Child {
  if (ownChild(w)) return ownChild(w)!;
  const child: Child = { ...c, id: w.nextId++, fam: OWN };
  w.children.push(child);
  w.own = child.id;
  return child;
}

export function newWorld(rng: Rng = Math.random): World {
  const w: World = {
    v: 3, day: 1, nextId: 1, families: [], children: [], unlocked: [...STARTER], helpers: [], furniture: [], muted: false,
    isabelle: { skin: 0, hair: 'long', hairColor: 'brown', outfit: { head: 'adult:head-1', outfit: 'adult:outfit-1' } },
  };
  addFamily(w, rng, 2);
  addFamily(w, rng, 1);
  return w;
}

/** A new family of 1 to 3 children, all different ages, never past the 22 children limit. */
export function addFamily(w: World, rng: Rng, size = 1 + Math.floor(rng() * 3)): Family | null {
  const room = MAX_CHILDREN - nursery(w).length;
  if (room <= 0) return null;
  const mum = pick(rng, Object.keys(PARENTS.mums)) as Mum;
  const dad = pick(rng, dadsFor(mum));
  const fam: Family = { id: w.nextId++, kids: [], mum, dad, visits: 0 };
  const used = new Set(w.children.map((c) => c.name));
  const names = shuffle(rng, NAMES.filter((n) => !used.has(n)));
  const ages = shuffle(rng, [0, 1, 2, 3, 4]);
  for (let i = 0; i < Math.min(size, room); i++) {
    const age = ages[i];
    const skin = pick(rng, familyTones(mum, dad));
    const child: Child = {
      ...randomLook(rng, kindOf(age), w.unlocked, skin),
      id: w.nextId++, name: names[i] ?? `Baby ${w.nextId}`, age, fam: fam.id,
      pers: pick(rng, Object.keys(PERSONALITIES) as Personality[]),
    };
    w.children.push(child);
    fam.kids.push(child.id);
  }
  w.families.push(fam);
  return fam;
}

const lockedItems = (w: World) => ITEMS.filter((i) => !w.unlocked.includes(i.id));

/** Unlock up to n clothes that aren't unlocked yet, in a random order. */
export function unlockSome(w: World, n: number, rng: Rng = Math.random): Item[] {
  const got = shuffle(rng, lockedItems(w)).slice(0, n);
  w.unlocked.push(...got.map((i) => i.id));
  return got;
}

/** Move to the next day: two new clothes, below 22 children a new family, and Isabelle's child a year older. */
export function nextDay(w: World, rng: Rng = Math.random) {
  w.day++;
  const clothes = unlockSome(w, 2, rng);
  const family = addFamily(w, rng);
  const own = ownChild(w);
  let birthday: Child | null = null;
  if (own && own.age < GROWN_UP) {
    const before = kindOf(own.age);
    own.age++;
    Object.assign(own, regrow(own, before, kindOf(own.age), w.unlocked, rng));
    birthday = own;
  }
  return { clothes, family, birthday };
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
  const clothes = shuffle(rng, lockedItems(w)).slice(0, 3).map((i) => i.id);
  // Clothes are always on offer while any are left, so the choice never runs dry early.
  const rest = shuffle(rng, pool).slice(0, clothes.length ? 2 : 3);
  return clothes.length ? [...rest, { kind: 'clothes', ids: clothes }] : rest;
}

export function takeReward(w: World, r: Reward) {
  if (r.kind === 'helper' && w.helpers.length < MAX_HELPERS && !w.helpers.includes(r.id)) w.helpers.push(r.id);
  if (r.kind === 'furniture' && !w.furniture.includes(r.id)) w.furniture.push(r.id);
  if (r.kind === 'clothes') w.unlocked.push(...r.ids.filter((id) => !w.unlocked.includes(id) && ITEM[id]));
}

export const familyName = (w: World, f: Family) => {
  const n = f.kids.map((id) => w.children.find((c) => c.id === id)!.name);
  return n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};
