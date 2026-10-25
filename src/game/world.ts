// The nursery that lasts between days: families, children, clothes, helpers, furniture, and how it grows.
import { BOND_AT, BOY_NAMES, FULL_DAY, FURNITURE, Floor, FurnId, GIRL_NAMES, GROW_EVERY, HELPERS, HelperId, LEAVE_AGE, LEVEL_UNLOCKS, MAX_CHILDREN, MAX_HELPERS, PERSONALITIES, Personality, SurpriseId, levelFor } from './catalog';
import { ITEM, ITEMS, Item, Look, STARTER, Sex, kindOf, randomLook, regrow } from './looks';

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

export type Child = Look & {
  id: number; name: string; age: number; pers: Personality; fam: number; sex: Sex;
  /** How much Isabelle has done for this child; it only ever goes up (BOND_AT gives the stars). */
  bond?: number;
  /** How many times this child has chatted with each other child, by id. */
  pals?: Record<number, number>;
  /** Isabelle has given this child their favourite thing. */
  favFound?: boolean;
  /** The day of their last birthday. */
  bday?: number;
};
/** A child who left for big school, as they were on their last day. */
export type Leaver = Child & { left: number; best?: string };
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

/** Put an older saved nursery right: every child a boy or a girl (from their name), each mum a dad who looks like her,
 *  and each child a skin tone between their parents'. */
export function matchFamilies(w: World, rng: Rng = Math.random) {
  for (const c of w.children) c.sex ??= BOY_NAMES.includes(c.name) ? 'boy' : 'girl';
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
  leavers: Leaver[];
  /** Hearts the nursery has ever sent home, and the level they have reached. */
  stars: number; level: number;
  /** Special days seen (album stickers), and the real date of the last one. */
  stickers: SurpriseId[]; surpriseOn: string;
  /** Where Isabelle has put each toy, and each room's wall colour (WALLS). */
  spots: Partial<Record<FurnId, [number, number]>>; walls: Record<Floor, number>;
};

/** An older save gets the newer parts empty, so nothing it has is lost. */
export function fillNew(w: World) {
  w.leavers ??= [];
  w.stars ??= 0;
  w.level ??= levelFor(w.stars);
  w.stickers ??= [];
  w.surpriseOn ??= '';
  w.spots ??= {};
  w.walls ??= { down: 0, up: 1 };
}

/** Isabelle's own child has family 0: comes every day, nobody picks them up, and grows a year a day. */
export const OWN = 0;
export const GROWN_UP = 16;
export const nursery = (w: World) => w.children.filter((c) => c.fam !== OWN);
export const ownChild = (w: World) => w.children.find((c) => c.id === w.own) ?? null;
export const ownIsHelper = (w: World) => (ownChild(w)?.age ?? 0) >= GROWN_UP;

export type NewChild = Look & { name: string; age: number; pers: Personality; sex: Sex };
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
    leavers: [], stars: 0, level: 1, stickers: [], surpriseOn: '', spots: {}, walls: { down: 0, up: 1 },
    isabelle: { skin: 0, hair: 'long', hairColor: 'brown', outfit: { head: 'adult:head-1', outfit: 'adult:outfit-1' } },
  };
  addFamily(w, rng, 2);
  addFamily(w, rng, 1);
  return w;
}

/** How many children the nursery has by this day: 3 on day 1, rising evenly to all 16 on day 10. */
export const childrenBy = (day: number) => Math.min(MAX_CHILDREN, Math.round(3 + ((MAX_CHILDREN - 3) * (day - 1)) / (FULL_DAY - 1)));

/** A new family of 1 to 3 children, all different ages, never past `limit` children (the 16 children limit). */
export function addFamily(w: World, rng: Rng, size = 1 + Math.floor(rng() * 3), limit = MAX_CHILDREN): Family | null {
  const room = Math.min(limit, MAX_CHILDREN) - nursery(w).length;
  if (room <= 0) return null;
  const mum = pick(rng, Object.keys(PARENTS.mums)) as Mum;
  const dad = pick(rng, dadsFor(mum));
  const fam: Family = { id: w.nextId++, kids: [], mum, dad, visits: 0 };
  const used = new Set(w.children.map((c) => c.name));
  const free = { boy: shuffle(rng, BOY_NAMES.filter((n) => !used.has(n))), girl: shuffle(rng, GIRL_NAMES.filter((n) => !used.has(n))) };
  const ages = shuffle(rng, [0, 1, 2, 3, 4]);
  for (let i = 0; i < Math.min(size, room); i++) {
    const age = ages[i];
    const skin = pick(rng, familyTones(mum, dad));
    let sex: Sex = rng() < 0.5 ? 'boy' : 'girl';
    if (!free[sex].length) sex = sex === 'boy' ? 'girl' : 'boy'; // keep every name different
    const child: Child = {
      ...randomLook(rng, kindOf(age), w.unlocked, skin, sex),
      id: w.nextId++, name: free[sex].shift() ?? `Baby ${w.nextId}`, age, fam: fam.id, sex,
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

/** A visiting child who is 5 has their last day today. */
export const lastDay = (c: Child) => c.fam !== OWN && c.age >= LEAVE_AGE;
export const birthdayToday = (w: World, c: Child) => c.fam !== OWN && c.bday === w.day;

/** Off to big school: out of the nursery and into the album. A family with nobody left stops coming. */
function leave(w: World, c: Child) {
  w.leavers.push({ ...c, left: w.day - 1, best: bestFriend(w, c)?.name });
  w.children = w.children.filter((x) => x !== c);
  const fam = w.families.find((f) => f.id === c.fam)!;
  fam.kids = fam.kids.filter((id) => id !== c.id);
  if (!fam.kids.length) w.families = w.families.filter((f) => f !== fam);
}

/** Move to the next day: yesterday's 5-year-olds leave, birthdays, two new clothes, new families up to the day's number
 *  of children, and Isabelle's child a year older. */
export function nextDay(w: World, rng: Rng = Math.random) {
  w.day++;
  const leavers = nursery(w).filter(lastDay);
  for (const c of leavers) leave(w, c);
  // Birthdays fall on different days for different children.
  const birthdays = nursery(w).filter((c) => (w.day + c.id) % GROW_EVERY === 0);
  for (const c of birthdays) {
    const before = kindOf(c.age);
    c.age++;
    c.bday = w.day;
    Object.assign(c, regrow(c, before, kindOf(c.age), w.unlocked, rng, c.sex));
  }
  const clothes = unlockSome(w, 2, rng);
  const families: Family[] = [];
  for (let f: Family | null; nursery(w).length < childrenBy(w.day) && (f = addFamily(w, rng, undefined, childrenBy(w.day))); ) families.push(f);
  const own = ownChild(w);
  let birthday: Child | null = null;
  if (own && own.age < GROWN_UP) {
    const before = kindOf(own.age);
    own.age++;
    Object.assign(own, regrow(own, before, kindOf(own.age), w.unlocked, rng, own.sex));
    birthday = own;
  }
  return { clothes, families, birthday, birthdays, leavers };
}

/** Friendship stars with Isabelle, 0 to 4. */
export const bondLevel = (c: Child) => BOND_AT.filter((n) => (c.bond ?? 0) >= n).length;

/** A child's best friend: the child here they have chatted with most, once they have chatted 3 times. */
export function bestFriend(w: World, c: Child): Child | null {
  let best: Child | null = null, most = 2;
  for (const [id, n] of Object.entries(c.pals ?? {})) {
    const o = w.children.find((x) => x.id === Number(id));
    if (o && n > most) { best = o; most = n; }
  }
  return best;
}

export function chatted(a: Child, b: Child) {
  a.pals = { ...a.pals, [b.id]: (a.pals?.[b.id] ?? 0) + 1 };
  b.pals = { ...b.pals, [a.id]: (b.pals?.[a.id] ?? 0) + 1 };
}

/** Hearts sent home count toward the nursery's level; each new level brings the next thing on the list. */
export function levelUp(w: World): FurnId[] {
  const got: FurnId[] = [];
  while (levelFor(w.stars) > w.level) {
    w.level++;
    const id = LEVEL_UNLOCKS[w.level - 2];
    if (id && !w.furniture.includes(id)) { w.furniture.push(id); got.push(id); }
  }
  return got;
}

const SURPRISE_DEFAULT: SurpriseId[] = ['pyjamas', 'teddies', 'parcel', 'balloons'];
/** The surprise for a real date: Halloween week and Advent have their own; winter can snow; spring has egg hunts. */
export function surpriseFor(now: Date, rng: Rng): SurpriseId {
  const m = now.getMonth() + 1, d = now.getDate();
  if (m === 10 && d >= 24) return 'halloween';
  if (m === 12 && d <= 26) return 'christmas';
  const pool = [...SURPRISE_DEFAULT];
  if (m === 12 || m <= 2) pool.push('snow');
  if (m === 3 || m === 4) pool.push('eggs');
  return pick(rng, pool);
}

/** One surprise a real day, on the first nursery day played that date (never on day 1, which is for learning).
 *  A missed day costs nothing. */
export function claimSurprise(w: World, now: Date, rng: Rng = Math.random): SurpriseId | null {
  const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (w.day === 1 || w.surpriseOn === date) return null;
  w.surpriseOn = date;
  const id = surpriseFor(now, rng);
  if (!w.stickers.includes(id)) w.stickers.push(id);
  return id;
}

export type Reward = { kind: 'helper'; id: HelperId } | { kind: 'furniture'; id: FurnId } | { kind: 'clothes'; ids: string[] };

/** Rewards start once all 16 children come; a good day is three in four children on 4 hearts or more. */
export function earnsReward(w: World, hearts: number[]): boolean {
  if (nursery(w).length < MAX_CHILDREN || !hearts.length) return false;
  return hearts.filter((h) => h >= 4).length / hearts.length >= 0.75;
}

export function rewardChoices(w: World, rng: Rng = Math.random): Reward[] {
  const pool: Reward[] = [];
  if (w.helpers.length < MAX_HELPERS) for (const id of Object.keys(HELPERS) as HelperId[]) if (!w.helpers.includes(id)) pool.push({ kind: 'helper', id });
  for (const id of Object.keys(FURNITURE) as FurnId[]) if (!w.furniture.includes(id) && !LEVEL_UNLOCKS.includes(id)) pool.push({ kind: 'furniture', id });
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
