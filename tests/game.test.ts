import { describe, expect, it } from 'vitest';
import { ACTS, BOY_NAMES, FULL_DAY, GIRL_NAMES, MAX_CHILDREN, PERSONALITIES, Personality, allowed, favourite } from '../src/game/catalog';
import { HAIR, ITEM, ITEMS, NEEDED, SLOTS, STARTER, fits, kindOf } from '../src/game/looks';
import { CLOSE, Day, METERS, METER_OF, OPEN, SPEED, clock, newDay } from '../src/game/day';
import { KEY, load, save, wipe } from '../src/game/save';
import { heartsLine, hello, tip } from '../src/game/talk';
import { Child, GROWN_UP, PARENTS, World, earnsReward, familyTones, haveChild, matchFamilies, newWorld, nextDay, nursery, ownChild, rewardChoices, takeReward } from '../src/game/world';

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
    const k = d.present().find((k) => d.need(k));
    if (k) d.act(k.id, d.needAct(k));
    d.advance(5);
  }
  return d;
}

describe('personalities', () => {
  it('every personality has a favourite and a tip at every age', () => {
    for (const p of Object.keys(PERSONALITIES) as Personality[]) for (let age = 0; age <= 16; age++) {
      const fav = favourite(p, age);
      expect(allowed(age)).toContain(fav);
      expect(PERSONALITIES[p].likes).toContain(fav);
      expect(tip({ id: 1, name: 'Max', age, pers: p, fam: 1, sex: 'girl', skin: 0, hair: '', hairColor: '', outfit: {} })).toContain('Max');
    }
  });
});

describe('the nursery grows', () => {
  it('starts with 3 children in 2 families and only starter clothes', () => {
    const w = newWorld(seeded(1));
    expect(w.children).toHaveLength(3);
    expect(w.families.map((f) => f.kids.length)).toEqual([2, 1]);
    expect(w.unlocked).toEqual(STARTER);
    expect(STARTER.length).toBeGreaterThan(10);
  });

  it('grows evenly from 3 children on day 1 to all 22 on day 10 in families of 1-3, siblings of different ages 0-4', () => {
    const rng = seeded(2);
    const w = newWorld(rng);
    const counts = [w.children.length];
    for (let d = 0; d < 40; d++) {
      const { families } = nextDay(w, rng);
      if (w.day > FULL_DAY) expect(families).toEqual([]);
      else expect(families.length).toBeGreaterThanOrEqual(1);
      if (w.day <= FULL_DAY) counts.push(w.children.length);
    }
    expect(counts).toEqual([3, 5, 7, 9, 11, 14, 16, 18, 20, 22]);
    expect(MAX_CHILDREN).toBe(22);
    expect(w.children).toHaveLength(MAX_CHILDREN);
    for (const f of w.families) {
      expect(f.kids.length).toBeLessThanOrEqual(3);
      const ages = f.kids.map((id) => w.children.find((c) => c.id === id)!.age);
      expect(new Set(ages).size).toBe(ages.length);
      for (const a of ages) expect(a >= 0 && a <= 4).toBe(true);
    }
    expect(new Set(w.children.map((c) => c.name)).size).toBe(MAX_CHILDREN);
  });

  it('unlocks two new clothes a day until every painted piece is unlocked', () => {
    const w = newWorld(seeded(3));
    const before = w.unlocked.length;
    expect(nextDay(w).clothes).toHaveLength(2);
    expect(w.unlocked.length).toBe(before + 2);
    for (let i = 0; i < 60; i++) nextDay(w);
    expect(ITEMS.every((i) => w.unlocked.includes(i.id))).toBe(true);
    expect(nextDay(w).clothes).toHaveLength(0);
  });

  it('every child is dressed in clothes for their own doll, with a painted hairstyle', () => {
    const rng = seeded(4);
    const w = newWorld(rng);
    for (let i = 0; i < 15; i++) nextDay(w, rng);
    for (const c of w.children) {
      const kind = kindOf(c.age);
      expect(HAIR[kind]).toContain(c.hair);
      for (const slot of NEEDED.filter((s) => SLOTS[kind].includes(s))) expect(c.outfit[slot]).toBeTruthy();
      for (const id of Object.values(c.outfit)) if (id) expect(ITEM[id].kind).toBe(kind);
    }
  });
});

describe('families look like families', () => {
  const tone = (who: string) => ({ ...PARENTS.mums, ...PARENTS.dads } as Record<string, number>)[who];

  it('parents are within one skin tone, and every child is between them', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rng = seeded(seed);
      const w = newWorld(rng);
      for (let i = 0; i < 12; i++) nextDay(w, rng);
      for (const f of w.families) {
        expect(Math.abs(tone(f.mum) - tone(f.dad))).toBeLessThanOrEqual(1);
        for (const id of f.kids) {
          const skin = w.children.find((c) => c.id === id)!.skin;
          expect(skin).toBeGreaterThanOrEqual(Math.min(tone(f.mum), tone(f.dad)));
          expect(skin).toBeLessThanOrEqual(Math.max(tone(f.mum), tone(f.dad)));
        }
      }
    }
  });

  it('an old save with a mismatched family is put right on load', () => {
    const w = newWorld(seeded(41));
    const f = w.families[0];
    f.mum = 'mum-1'; // lightest
    f.dad = 'dad-4'; // darkest
    for (const id of f.kids) w.children.find((c) => c.id === id)!.skin = 5;
    matchFamilies(w, seeded(41));
    expect(Math.abs(tone(f.mum) - tone(f.dad))).toBeLessThanOrEqual(1);
    for (const id of f.kids) expect(familyTones(f.mum, f.dad)).toContain(w.children.find((c) => c.id === id)!.skin);
  });
});

describe('boys and girls', () => {
  it('every child is a boy or a girl, with a name and clothes to match', () => {
    const rng = seeded(50);
    const w = newWorld(rng);
    for (let i = 0; i < 20; i++) nextDay(w, rng);
    for (const id of ITEMS.map((i) => i.id)) if (!w.unlocked.includes(id)) w.unlocked.push(id);
    const kids = w.children;
    expect(kids.some((c) => c.sex === 'boy') && kids.some((c) => c.sex === 'girl')).toBe(true);
    for (const c of kids) {
      expect((c.sex === 'boy' ? BOY_NAMES : GIRL_NAMES)).toContain(c.name);
      for (const id of Object.values(c.outfit)) if (id) expect(fits(ITEM[id], c.sex)).toBe(true);
    }
  });

  it('there are plenty of clothes for each, and an old save gets boys and girls from their names', () => {
    for (const sex of ['boy', 'girl'] as const) for (const slot of ['head', 'top', 'bottoms', 'shoes'] as const) {
      expect(ITEMS.filter((i) => i.kind === 'kid' && i.slot === slot && fits(i, sex)).length).toBeGreaterThanOrEqual(8);
    }
    expect(ITEMS.filter((i) => i.for === 'boy').length).toBeGreaterThan(15);
    expect(ITEMS.filter((i) => i.for === 'girl').length).toBeGreaterThan(15);
    const w = newWorld(seeded(51));
    const c = w.children[0] as Partial<Child>;
    c.name = 'Archie';
    delete c.sex;
    matchFamilies(w);
    expect(w.children[0].sex).toBe('boy');
  });
});

describe('a day', () => {
  /** A day with both day-1 families dropped off. */
  function started(seed: number, setup?: (w: World) => void) {
    const w = newWorld(seeded(seed));
    setup?.(w);
    const d = new Day(w, newDay(w, seeded(seed)), seeded(seed));
    d.start();
    for (const f of w.families) d.dropOff(f.id);
    return { w, d };
  }

  it('runs 8am to 5pm and ends when every family has gone home', () => {
    const w = newWorld(seeded(5));
    const d = playDay(w);
    expect(d.done()).toBe(true);
    expect(d.s.t).toBeLessThanOrEqual(CLOSE);
    expect(clock(OPEN)).toBe('8:00am');
    expect(clock(CLOSE)).toBe('5:00pm');
    expect(clock(12 * 60 + 30.7)).toBe('12:30pm');
    expect(SPEED * 15 * 60).toBe(CLOSE - OPEN);
  });

  it('needs build up over time and always ask for something that age can do', () => {
    const rng = seeded(6);
    const w = newWorld(rng);
    for (let i = 0; i < 12; i++) nextDay(w, rng);
    const d = new Day(w, newDay(w, rng), rng);
    d.start();
    let seen = 0;
    for (let i = 0; i < 400 && !d.done(); i++) {
      const front = d.s.queue[0];
      if (front !== undefined) { d.fam(front).state === 'drop' ? d.dropOff(front) : d.pickUp(front); continue; }
      for (const k of d.present()) if (d.need(k)) { seen++; expect(allowed(d.child(k.id).age)).toContain(d.needAct(k)); }
      d.advance(5);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('turns away things for the wrong age', () => {
    const { w, d } = started(8);
    const baby = w.children.find((c) => c.age === 0);
    const big = w.children.find((c) => c.age >= 3);
    if (baby) expect(d.act(baby.id, 'painting')).toEqual({ ok: false, why: 'tooLittle' });
    if (big) expect(d.act(big.id, 'bottle')).toEqual({ ok: false, why: 'tooBig' });
  });

  it('meeting a need empties that meter, adds a heart, and makes them laugh; the favourite adds two', () => {
    const { w, d } = started(9);
    const c = d.child(w.families[1].kids[0]);
    const k = d.kid(c.id);
    for (const m of METERS) k.m[m] = 0;
    const fav = favourite(c.pers, c.age);
    const other = allowed(c.age).find((a) => METER_OF[a] !== METER_OF[fav] && a !== 'nap')!;
    k.m[METER_OF[other]] = 80;
    expect(d.need(k)).toBe(METER_OF[other]);
    expect(d.act(c.id, other)).toMatchObject({ ok: true, matched: true, fav: false });
    expect(k.hearts).toBe(4);
    expect(k.m[METER_OF[other]]).toBe(0);
    expect(d.mood(k)).toBe('laugh');
    d.advance(20);
    k.m[METER_OF[fav]] = 80;
    k.hearts = 3;
    expect(d.act(c.id, fav)).toMatchObject({ ok: true, matched: true, fav: true });
    expect(k.hearts).toBe(5);
  });

  it('a nap means asleep for an hour (babies a bit longer), and tiredness goes down', () => {
    const { w, d } = started(10);
    const id = w.families[1].kids[0];
    d.kid(id).m.tired = 90;
    expect(d.act(id, 'nap').ok).toBe(true);
    expect(d.act(id, 'cuddle')).toEqual({ ok: false, why: 'asleep' });
    expect(d.mood(d.kid(id))).toBe('asleep');
    d.advance(76);
    expect(d.asleep(d.kid(id))).toBe(false);
    expect(d.kid(id).m.tired).toBeLessThan(10);
  });

  it('a crying child loses half a heart every 20 minutes', () => {
    const { w, d } = started(11, (w) => { w.helpers = []; });
    const k = d.kid(w.families[1].kids[0]);
    d.s.next.emily = CLOSE;
    k.m.hunger = 99;
    const ev = d.advance(1);
    expect(ev).toContainEqual({ type: 'startCry', kid: k.id });
    expect(d.mood(k)).toBe('cry');
    d.advance(20);
    expect(k.hearts).toBe(2.5);
  });

  it('a child too tired nods off on the floor and is a bit sad about it', () => {
    const { w, d } = started(12);
    const k = d.kid(w.families[1].kids[0]);
    d.s.next.emily = CLOSE;
    k.busyUntil = 0;
    k.m.tired = 100;
    expect(d.advance(1)).toContainEqual({ type: 'doze', kid: k.id });
    expect(k.floorNap).toBe(true);
    expect(k.hearts).toBe(2.5);
  });

  it('children play by themselves, chat and wander, and self-play is on their own floor', () => {
    const { d } = started(13);
    d.s.next.emily = CLOSE;
    const types = new Set<string>();
    for (let i = 0; i < 300; i++) for (const ev of d.advance(1)) {
      types.add(ev.type);
      if (ev.type === 'selfplay') expect(ACTS[ev.act].floor).toBe(d.kid(ev.kid).floor);
    }
    expect(types).toContain('selfplay');
    expect(types).toContain('wander');
  });

  it('⏩ waits until drop-offs at the desk are greeted', () => {
    const w = newWorld(seeded(14));
    const d = new Day(w, newDay(w), seeded(14));
    d.start();
    expect(d.s.queue).toHaveLength(2);
    expect(d.canSkip()).toBe(false);
    expect(d.hint()).toMatch(/at the door/);
    for (const f of w.families) d.dropOff(f.id);
    d.skip();
    expect(d.s.t).toBe(OPEN + 30);
  });

  it('parents queue at their time; at pick-up the family remembers the hearts', () => {
    const { w, d } = started(15);
    d.advance(960 - OPEN);
    expect(d.s.queue).toEqual([w.families[0].id]);
    d.advance(60);
    expect(d.s.queue).toEqual([w.families[0].id, w.families[1].id]);
    const hearts = d.kid(w.families[0].kids[0]).hearts;
    d.pickUp(w.families[0].id);
    d.pickUp(w.families[1].id);
    expect(d.done()).toBe(true);
    expect(w.families[0].last).toEqual({ day: 1, hearts: expect.objectContaining({ [w.families[0].kids[0]]: hearts }) });
  });

  it('helpers see to needs of their kind every 15 minutes', () => {
    const { w, d } = started(16, (w) => { w.helpers = ['story']; });
    d.s.next.emily = CLOSE;
    const k = d.kid(w.families[1].kids[0]);
    for (const m of METERS) k.m[m] = 0;
    k.m.love = 80;
    const ev = d.advance(1);
    expect(ev).toContainEqual({ type: 'helper', helper: 'story', kid: k.id, act: d.child(k.id).pers === 'chatty' && d.child(k.id).age >= 3 ? 'story' : 'cuddle' });
    expect(k.m.love).toBeLessThan(5);
  });

  it('Emily helps downstairs when the desk is quiet, but not babies upstairs', () => {
    const { d } = started(17);
    for (const k of d.present()) { for (const m of METERS) k.m[m] = 0; k.busyUntil = 0; }
    const up = d.present().find((k) => k.floor === 'up');
    if (up) up.m.toilet = 90;
    const down = d.present().find((k) => k.floor === 'down' && d.child(k.id).age >= 2)!; // a snack, not a bottle
    down.m.hunger = 80;
    d.s.next.emily = d.s.t;
    const ev = d.advance(1).filter((e) => e.type === 'helper');
    expect(ev).toEqual([{ type: 'helper', helper: 'emily', kid: down.id, act: 'snack' }]);
  });
});

describe('wishes', () => {
  it('three a day, about things today\'s children can do, and they come true by playing', () => {
    const w = newWorld(seeded(40));
    const d = new Day(w, newDay(w, seeded(40)), seeded(40));
    expect(d.s.wishes).toHaveLength(3);
    const fav = d.s.wishes.find((x) => x.kind === 'favourite')!;
    const c = d.child(fav.kid!);
    expect(fav.text).toContain(c.name);
    const act = d.s.wishes.find((x) => x.kind === 'act')!;
    expect(w.children.some((k) => allowed(k.age).includes(act.act!))).toBe(true);
    d.start();
    for (const f of w.families) d.dropOff(f.id);
    const r = d.act(c.id, fav.act!);
    expect(r.ok && r.wishes).toContainEqual(expect.objectContaining({ kind: 'favourite' }));
    // A wish only comes true once.
    d.advance(30);
    const again = d.act(c.id, fav.act!);
    expect(again.ok && again.wishes.some((x) => x.kind === 'favourite')).toBe(false);
  });
});

describe('rewards', () => {
  it('only come with all the children and a good day', () => {
    const rng = seeded(15);
    const w = newWorld(rng);
    expect(earnsReward(w, [5, 5, 5])).toBe(false);
    for (let i = 0; i < 40; i++) nextDay(w, rng);
    expect(earnsReward(w, Array(MAX_CHILDREN).fill(4))).toBe(true);
    expect(earnsReward(w, [...Array(37).fill(5), ...Array(13).fill(1)])).toBe(false);
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

  it('clothes rewards unlock three locked pieces', () => {
    const w = newWorld(seeded(17));
    const r = rewardChoices(w, seeded(17)).find((x) => x.kind === 'clothes')!;
    expect(r.kind === 'clothes' && r.ids.every((id) => !w.unlocked.includes(id))).toBe(true);
    takeReward(w, r);
    expect(r.kind === 'clothes' && r.ids.every((id) => w.unlocked.includes(id))).toBe(true);
  });
});

describe("Isabelle's own child", () => {
  const baby = { name: 'Luna', age: 0, pers: 'sleepy' as const, sex: 'girl' as const, skin: 2, hair: 'wisps', hairColor: 'brown', outfit: { suit: 'baby:suit-1' } };

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
    expect(HAIR.adult).toContain(c.hair);
    expect(nursery(w)).toHaveLength(MAX_CHILDREN);
    expect(w.children).toHaveLength(MAX_CHILDREN + 1);
    expect(earnsReward(w, Array(MAX_CHILDREN).fill(5))).toBe(true);
    const d = new Day(w, newDay(w, rng), rng);
    expect(d.kid(c.id).here).toBe(false);
    d.start();
    d.dropOff(w.families[0].id);
    const k = d.kid(w.families[0].kids[0]);
    for (const m of METERS) k.m[m] = 0;
    k.m.toilet = 80;
    k.busyUntil = 0;
    expect(d.advance(1)).toContainEqual({ type: 'helper', helper: 'own', kid: k.id, act: d.needAct(k, 'toilet') });
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
    expect(w.children).toHaveLength(MAX_CHILDREN);
  });
});
