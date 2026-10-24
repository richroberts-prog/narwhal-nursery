import { describe, expect, it } from 'vitest';
import { DAILY, ITEM, MAX_CHILDREN, PERSONALITIES, Personality, STARTER, allowed, favourite } from '../src/game/catalog';
import { CLOSE, Day, OPEN, clock, newDay } from '../src/game/day';
import { KEY, load, save, wipe } from '../src/game/save';
import { heartsLine, hello, tip } from '../src/game/talk';
import { GROWN_UP, World, earnsReward, haveChild, newWorld, nextDay, nursery, ownChild, rewardChoices, showsDummy, takeReward } from '../src/game/world';

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays a day like a careful player: greet the desk, meet the oldest need, else skip. */
function playDay(w: World, rng = seeded(7)) {
  const d = new Day(w, newDay(w, rng), rng);
  d.start();
  for (let guard = 0; guard < 2000 && !d.done(); guard++) {
    const front = d.s.queue[0];
    if (front !== undefined) { d.fam(front).state === 'drop' ? d.dropOff(front) : d.pickUp(front); continue; }
    const k = d.present().filter((k) => k.need && !d.asleep(k))[0];
    if (k) d.act(k.id, k.need!.act);
    else d.skip();
  }
  return d;
}

describe('personalities', () => {
  it('every personality has a favourite and a tip at every age', () => {
    for (const p of Object.keys(PERSONALITIES) as Personality[]) for (let age = 0; age <= 16; age++) {
      const fav = favourite(p, age);
      expect(allowed(age)).toContain(fav);
      expect(PERSONALITIES[p].likes).toContain(fav);
      expect(tip({ id: 1, name: 'Max', age, pers: p, fam: 1, skin: '', hair: '', hairColor: '', outfit: {} as never })).toContain('Max');
    }
  });
});

describe('the nursery grows', () => {
  it('starts with 3 children in 2 families and only starter clothes', () => {
    const w = newWorld(seeded(1));
    expect(w.children).toHaveLength(3);
    expect(w.families.map((f) => f.kids.length)).toEqual([2, 1]);
    expect(w.unlocked).toEqual(STARTER);
  });

  it('adds one family of 1-3 children a day, siblings of different ages 0-4, never past 22', () => {
    const rng = seeded(2);
    const w = newWorld(rng);
    for (let d = 0; d < 40; d++) {
      const before = w.children.length;
      const { family } = nextDay(w, rng);
      if (before < MAX_CHILDREN) expect(family!.kids.length).toBeGreaterThanOrEqual(1);
      else expect(family).toBeNull();
    }
    expect(w.children).toHaveLength(MAX_CHILDREN);
    for (const f of w.families) {
      expect(f.kids.length).toBeLessThanOrEqual(3);
      const ages = f.kids.map((id) => w.children.find((c) => c.id === id)!.age);
      expect(new Set(ages).size).toBe(ages.length);
      for (const a of ages) expect(a >= 0 && a <= 4).toBe(true);
    }
    expect(new Set(w.children.map((c) => c.name)).size).toBe(MAX_CHILDREN);
  });

  it('unlocks a hat, headband and dummy, then a top, bottoms and shoes', () => {
    const w = newWorld(seeded(3));
    expect(nextDay(w).clothes.map((i) => i.cat)).toEqual(['hat', 'headband', 'dummy']);
    expect(nextDay(w).clothes.map((i) => i.cat)).toEqual(['top', 'bottoms', 'shoes']);
    for (let i = 0; i < 20; i++) nextDay(w);
    expect(DAILY.every((id) => w.unlocked.includes(id))).toBe(true);
  });

  it('only gives dummies to children 2 and under', () => {
    const rng = seeded(4);
    const w = newWorld(rng);
    for (let i = 0; i < 15; i++) nextDay(w, rng);
    for (const c of w.children) if (!showsDummy(c.age)) expect(c.outfit.dummy).toBe('dummy0');
    expect(showsDummy(2)).toBe(true);
    expect(showsDummy(3)).toBe(false);
    expect(showsDummy('adult')).toBe(false);
  });
});

describe('a day', () => {
  it('runs 8am to 5pm and ends when every family has gone home', () => {
    const w = newWorld(seeded(5));
    const d = playDay(w);
    expect(d.done()).toBe(true);
    expect(d.s.t).toBeLessThanOrEqual(CLOSE);
    expect(clock(OPEN)).toBe('8:00am');
    expect(clock(CLOSE)).toBe('5:00pm');
    expect(clock(12 * 60 + 30)).toBe('12:30pm');
  });

  it('only asks for things a child that age can do', () => {
    const rng = seeded(6);
    const w = newWorld(rng);
    for (let i = 0; i < 12; i++) nextDay(w, rng);
    const d = new Day(w, newDay(w, rng), rng);
    d.start();
    for (let i = 0; i < 300 && !d.done(); i++) {
      const front = d.s.queue[0];
      if (front !== undefined) { d.fam(front).state === 'drop' ? d.dropOff(front) : d.pickUp(front); continue; }
      for (const k of d.present()) if (k.need) expect(allowed(d.child(k.id).age)).toContain(k.need.act);
      d.skip();
    }
  });

  it('turns away things for the wrong age', () => {
    const w = newWorld(seeded(8));
    const d = new Day(w, newDay(w), seeded(8));
    d.start();
    d.dropOff(w.families[0].id);
    d.dropOff(w.families[1].id);
    const baby = w.children.find((c) => c.age === 0);
    const big = w.children.find((c) => c.age >= 3);
    if (baby) expect(d.act(baby.id, 'painting')).toEqual({ ok: false, why: 'tooLittle' });
    if (big) expect(d.act(big.id, 'bottle')).toEqual({ ok: false, why: 'tooBig' });
  });

  it('meeting a need adds a heart, the favourite adds two, and the clock moves', () => {
    const w = newWorld(seeded(9));
    const d = new Day(w, newDay(w), seeded(9));
    d.start();
    d.dropOff(w.families[1].id);
    const c = d.child(w.families[1].kids[0]);
    const k = d.kid(c.id);
    const other = allowed(c.age).find((a) => a !== favourite(c.pers, c.age))!;
    k.need = { act: other, since: d.s.t };
    const t = d.s.t;
    expect(d.act(c.id, other)).toMatchObject({ ok: true, matched: true, fav: false });
    expect(k.hearts).toBe(4);
    expect(d.s.t).toBe(t + 15);
    k.sleepUntil = 0;
    k.need = { act: favourite(c.pers, c.age), since: d.s.t };
    d.act(c.id, favourite(c.pers, c.age));
    expect(k.hearts).toBe(5);
  });

  it('a nap means asleep for an hour', () => {
    const w = newWorld(seeded(10));
    const d = new Day(w, newDay(w), seeded(10));
    d.start();
    d.dropOff(w.families[1].id);
    const id = w.families[1].kids[0];
    expect(d.act(id, 'nap').ok).toBe(true);
    expect(d.act(id, 'cuddle')).toEqual({ ok: false, why: 'asleep' });
    d.advance(60);
    expect(d.asleep(d.kid(id))).toBe(false);
  });

  it('a need left for an hour costs half a heart', () => {
    const w = newWorld(seeded(11));
    const d = new Day(w, newDay(w), seeded(11));
    d.start();
    d.dropOff(w.families[1].id);
    const k = d.kid(w.families[1].kids[0]);
    k.need = { act: 'cuddle', since: d.s.t };
    d.advance(60);
    expect(k.hearts).toBe(2.5);
  });

  it('⏩ waits until drop-offs at the desk are greeted', () => {
    const w = newWorld(seeded(12));
    const d = new Day(w, newDay(w), seeded(12));
    d.start();
    expect(d.s.queue).toHaveLength(2);
    expect(d.canSkip()).toBe(false);
    expect(d.hint()).toMatch(/at the desk/);
    d.dropOff(w.families[0].id);
    d.dropOff(w.families[1].id);
    expect(d.canSkip()).toBe(true);
    d.skip();
    expect(d.s.t).toBe(OPEN + 30);
  });

  it('parents join the pick-up queue at their time, and at 5pm everyone left is queued', () => {
    const w = newWorld(seeded(13));
    const d = new Day(w, newDay(w), seeded(13));
    d.start();
    for (const f of w.families) d.dropOff(f.id);
    d.advance(960 - OPEN);
    expect(d.s.queue).toEqual([w.families[0].id]);
    d.advance(60);
    expect(d.s.queue).toEqual([w.families[0].id, w.families[1].id]);
    d.pickUp(w.families[0].id);
    d.pickUp(w.families[1].id);
    expect(d.done()).toBe(true);
  });

  it('helpers meet needs of their kind by themselves', () => {
    const w = newWorld(seeded(14));
    w.helpers = ['story'];
    const d = new Day(w, newDay(w), seeded(14));
    d.start();
    d.dropOff(w.families[1].id);
    const k = d.kid(w.families[1].kids[0]);
    k.need = { act: 'cuddle', since: d.s.t };
    const ev = d.advance(5);
    expect(ev).toContainEqual({ type: 'helper', helper: 'story', kid: k.id, act: 'cuddle' });
    expect(k.need).toBeNull();
    expect(k.did).toEqual(['cuddle']);
  });
});

describe('rewards', () => {
  it('only come with 22 children and a good day', () => {
    const rng = seeded(15);
    const w = newWorld(rng);
    expect(earnsReward(w, [5, 5, 5])).toBe(false);
    for (let i = 0; i < 40; i++) nextDay(w, rng);
    expect(earnsReward(w, Array(22).fill(4))).toBe(true);
    expect(earnsReward(w, [...Array(16).fill(5), ...Array(6).fill(1)])).toBe(false);
  });

  it('offer up to 3, never a fifth helper or a repeat', () => {
    const rng = seeded(16);
    const w = newWorld(rng);
    for (let i = 0; i < 60; i++) {
      const r = rewardChoices(w, rng);
      expect(r.length).toBeLessThanOrEqual(3);
      if (!r.length) break;
      takeReward(w, r[0]);
    }
    expect(w.helpers.length).toBeLessThanOrEqual(4);
    expect(new Set(w.furniture).size).toBe(w.furniture.length);
  });

  it('clothes rewards unlock the special clothes', () => {
    const w = newWorld(seeded(17));
    const r = rewardChoices(w, seeded(17)).find((x) => x.kind === 'clothes')!;
    takeReward(w, r);
    expect(w.unlocked).toContain('hat12');
    expect(ITEM['hat12'].name).toBe('Silver crown');
  });
});

describe("Isabelle's own child", () => {
  const baby = { name: 'Luna', age: 0, pers: 'sleepy' as const, skin: '#ffe3cc', hair: 'tuft', hairColor: '#6b4226' };

  it('is here all day, needs no pick-up, and the day still ends', () => {
    const w = newWorld(seeded(30));
    const c = haveChild(w, baby);
    expect(haveChild(w, { ...baby, name: 'Second' })).toBe(c);
    const d = playDay(w, seeded(30));
    expect(d.done()).toBe(true);
    expect(d.kid(c.id).here).toBe(true);
    expect(d.kid(c.id).did.length).toBeGreaterThan(0);
  });

  it('joins today straight away when made mid-day', () => {
    const w = newWorld(seeded(31));
    const d = new Day(w, newDay(w), seeded(31));
    d.start();
    d.addOwn(haveChild(w, baby));
    expect(d.present().map((k) => k.id)).toContain(w.own);
  });

  it("grows a year a day, doesn't count toward the 22, and at 16 helps with anything", () => {
    const rng = seeded(32);
    const w = newWorld(rng);
    const c = haveChild(w, baby);
    const birthdays: number[] = [];
    for (let i = 0; i < 40; i++) { const b = nextDay(w, rng).birthday; if (b) birthdays.push(b.age); }
    expect(birthdays).toEqual(Array.from({ length: GROWN_UP }, (_, i) => i + 1));
    expect(c.age).toBe(GROWN_UP);
    expect(c.hair).not.toBe('tuft');
    expect(nursery(w)).toHaveLength(MAX_CHILDREN);
    expect(w.children).toHaveLength(MAX_CHILDREN + 1);
    expect(earnsReward(w, Array(22).fill(5))).toBe(true);
    const d = new Day(w, newDay(w, rng), rng);
    expect(d.kid(c.id).here).toBe(false);
    d.start();
    d.dropOff(w.families[0].id);
    const k = d.kid(w.families[0].kids[0]);
    k.need = { act: allowed(d.child(k.id).age)[0], since: d.s.t };
    expect(d.advance(5)).toContainEqual({ type: 'helper', helper: 'own', kid: k.id, act: allowed(d.child(k.id).age)[0] });
    expect(ownChild(w)!.name).toBe('Luna');
  });
});

describe('talk and saving', () => {
  it('says names, never he or she', () => {
    const w = newWorld(seeded(18));
    for (const c of w.children) {
      expect(tip(c)).toContain(c.name);
      expect(`${tip(c)} ${heartsLine(c, 5)}`).not.toMatch(/\b(he|she|his|her)\b/i);
    }
    expect(hello(w.children.slice(0, 2), true)).toMatch(/^Hi Isabelle! These are/);
    expect(hello(w.children.slice(0, 2), false)).toMatch(/are here again/);
  });

  it('round-trips, ignores junk, and wipes', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    const w = newWorld(seeded(19));
    save(store, { world: w, today: null });
    expect(load(store)!.world.children).toHaveLength(3);
    m.set(KEY, '{bad');
    expect(load(store)).toBeNull();
    wipe(store);
    expect(load(store)).toBeNull();
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(load(broken)).toBeNull();
    expect(() => save(broken, { world: w, today: null })).not.toThrow();
  });

  it('a careful player can play 30 days in a row', () => {
    const rng = seeded(20);
    const w = newWorld(rng);
    for (let i = 0; i < 30; i++) {
      const d = playDay(w, rng);
      expect(d.done()).toBe(true);
      const hearts = d.s.kids.map((k) => k.hearts);
      if (earnsReward(w, hearts)) { const r = rewardChoices(w, rng); if (r.length) takeReward(w, r[0]); }
      nextDay(w, rng);
    }
    expect(w.children).toHaveLength(22);
  });
});
