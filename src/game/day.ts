// One nursery day in real time: the clock, who is here, how hungry, tired, bored and needy each child is getting,
// what children do by themselves, the queue at the desk, and who helps.
import { ACTS, Act, FUN, Floor, HELPERS, HelperId, allowed, favourite } from './catalog';
import { Child, GROWN_UP, OWN, Rng, World, familyName, ownIsHelper, pick } from './world';

export const OPEN = 8 * 60;
export const CLOSE = 17 * 60;
export const MAX_HEARTS = 5;
/** Game minutes per real second: a 9-hour day takes 15 minutes. */
export const SPEED = 540 / (15 * 60);

export type Meter = 'hunger' | 'tired' | 'toilet' | 'fun' | 'love';
export const METERS: Meter[] = ['hunger', 'tired', 'toilet', 'fun', 'love'];
export const METER_INFO: Record<Meter, { e: string; label: string }> = {
  hunger: { e: '🍽️', label: 'Hungry' }, tired: { e: '😴', label: 'Tired' }, toilet: { e: '🧷', label: 'Toilet' },
  fun: { e: '🎈', label: 'Bored' }, love: { e: '💗', label: 'Needs love' },
};
export const METER_OF: Record<Act, Meter> = {
  bottle: 'hunger', snack: 'hunger', nap: 'tired', nappy: 'toilet', potty: 'toilet', cuddle: 'love', story: 'love',
  blocks: 'fun', song: 'fun', painting: 'fun', dressup: 'fun', outside: 'fun', play: 'fun',
};
/** A meter at WANT shows a bubble; at CRY the child cries (babies sooner). */
export const WANT = 65;
export const cryAt = (age: number) => (age === 0 ? 85 : 92);

export type FamState = 'coming' | 'drop' | 'in' | 'pick' | 'gone';
export type DayFam = { id: number; arrive: number; leave: number; parent: 'mum' | 'dad'; state: FamState };
export type DayKid = {
  id: number; here: boolean; floor: Floor; x: number; y: number; at: string;
  hearts: number; m: Record<Meter, number>; did: Act[];
  sleepUntil: number; floorNap: boolean; busyUntil: number; laughUntil: number; crying: boolean; cryLossAt: number; nextMoveAt: number;
};
export type DayState = { day: number; t: number; fams: DayFam[]; kids: DayKid[]; queue: number[]; next: Record<string, number> };
export type Event =
  | { type: 'arrive'; fam: number }
  | { type: 'pickup'; fam: number }
  | { type: 'helper'; helper: HelperId | 'own' | 'emily'; kid: number; act: Act }
  | { type: 'selfplay'; kid: number; act: Act }
  | { type: 'wander' | 'doze' | 'startCry'; kid: number }
  | { type: 'chat'; kid: number; with: number };
export type ActResult = { ok: false; why: 'asleep' | 'tooLittle' | 'tooBig' } | { ok: true; matched: boolean; fav: boolean };
export type Mood = 'asleep' | 'laugh' | 'cry' | 'want' | 'happy';

const between = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));

/** Minutes for a meter to go from empty to full (before the crowd slow-down). */
function fillTime(c: Child, m: Meter): number {
  const baby = c.age === 0;
  const small = c.age <= 2;
  switch (m) {
    case 'hunger': return (baby ? 120 : 170) * (c.pers === 'hungry' ? 0.75 : 1);
    case 'tired': return (baby ? 150 : small ? 200 : 280) * (c.pers === 'sleepy' ? 0.7 : 1);
    case 'toilet': return baby ? 130 : small ? 160 : 200;
    case 'fun': return baby ? Infinity : 110 * (c.pers === 'wild' ? 0.75 : c.pers === 'creative' ? 0.85 : 1);
    case 'love': return 160 * (c.pers === 'shy' ? 0.6 : c.pers === 'chatty' ? 0.85 : 1);
  }
}

const empty = (): Record<Meter, number> => ({ hunger: 0, tired: 0, toilet: 0, fun: 0, love: 0 });

/** Isabelle's own child is here from the start (until grown up); everyone else comes with a parent. */
const dayKid = (c: Child): DayKid => ({
  id: c.id, here: c.fam === OWN && c.age < GROWN_UP, floor: c.age === 0 ? 'up' : 'down', x: 0, y: 0, at: '',
  hearts: 3, m: empty(), did: [], sleepUntil: 0, floorNap: false, busyUntil: 0, laughUntil: 0, crying: false, cryLossAt: 0, nextMoveAt: 0,
});

/** Day 1 everyone comes at 8 and stays late; after that drop-offs and pick-ups spread across the day. */
export function newDay(w: World, rng: Rng = Math.random): DayState {
  const fams = w.families.map((f, i): DayFam => ({
    id: f.id, parent: rng() < 0.5 ? 'mum' : 'dad', state: 'coming',
    arrive: w.day === 1 ? OPEN : pick(rng, [480, 480, 480, 540, 600]),
    leave: w.day === 1 ? [960, 1020][i % 2] : pick(rng, [840, 900, 960, 1020, 1020]),
  }));
  return { day: w.day, t: OPEN, fams, kids: w.children.map(dayKid), queue: [], next: { emily: OPEN + 30 } };
}

export class Day {
  constructor(public w: World, public s: DayState, private rng: Rng = Math.random) {}

  child = (id: number): Child => this.w.children.find((c) => c.id === id)!;
  kid = (id: number): DayKid => this.s.kids.find((k) => k.id === id)!;
  fam = (id: number): DayFam => this.s.fams.find((f) => f.id === id)!;
  present = (): DayKid[] => this.s.kids.filter((k) => k.here);
  asleep = (k: DayKid) => k.sleepUntil > this.s.t;
  busy = (k: DayKid) => k.busyUntil > this.s.t;

  /** The meter that most needs seeing to, if any is past WANT. */
  need(k: DayKid): Meter | null {
    if (this.asleep(k)) return null;
    const top = METERS.reduce((a, b) => (k.m[b] > k.m[a] ? b : a));
    return k.m[top] >= WANT ? top : null;
  }

  /** What would meet that need for this child's age and personality. */
  needAct(k: DayKid, m: Meter = this.need(k)!): Act {
    const c = this.child(k.id);
    const fav = favourite(c.pers, c.age);
    switch (m) {
      case 'hunger': return c.age <= 1 ? 'bottle' : 'snack';
      case 'tired': return 'nap';
      case 'toilet': return c.age <= 2 ? 'nappy' : 'potty';
      case 'love': return c.pers === 'chatty' && c.age >= 3 ? 'story' : 'cuddle';
      case 'fun': return FUN.includes(fav) ? fav : allowed(c.age).find((a) => FUN.includes(a)) ?? 'cuddle';
    }
  }

  mood(k: DayKid): Mood {
    if (this.asleep(k)) return 'asleep';
    if (k.laughUntil > this.s.t) return 'laugh';
    const top = Math.max(...METERS.map((m) => k.m[m]));
    if (top >= cryAt(this.child(k.id).age)) return 'cry';
    return top >= WANT ? 'want' : 'happy';
  }

  start(): Event[] { return this.advance(0); }

  /** Isabelle's new child joins today straight away. */
  addOwn(c: Child) {
    if (!this.s.kids.some((k) => k.id === c.id)) this.s.kids.push({ ...dayKid(c), here: true, nextMoveAt: this.s.t + 5 });
  }

  /** Move the clock on. Big jumps go a minute at a time so needs and helpers keep up. */
  advance(mins: number): Event[] {
    const events: Event[] = [];
    let left = mins;
    do {
      const dt = Math.min(1, left);
      events.push(...this.tick(dt));
      left -= dt;
    } while (left > 1e-9 && this.s.t < CLOSE);
    return events;
  }

  private tick(dt: number): Event[] {
    const s = this.s;
    s.t = Math.min(CLOSE, s.t + dt);
    const events: Event[] = [];
    for (const f of s.fams) {
      if (f.state === 'coming' && f.arrive <= s.t) { f.state = 'drop'; s.queue.push(f.id); events.push({ type: 'arrive', fam: f.id }); }
      if (f.state === 'in' && f.leave <= s.t) { f.state = 'pick'; s.queue.push(f.id); events.push({ type: 'pickup', fam: f.id }); }
    }
    // One pair of hands: the more children, the slower each one's needs build, so a full nursery stays playable.
    const crowd = 1.4 * Math.max(1, this.present().length / 4);
    for (const k of this.present()) {
      const c = this.child(k.id);
      const asleep = this.asleep(k);
      if (k.sleepUntil && !asleep) { k.sleepUntil = 0; k.floorNap = false; }
      for (const m of METERS) {
        if (m === 'tired' && asleep) { k.m.tired = Math.max(0, k.m.tired - (100 / 50) * dt); continue; }
        k.m[m] = Math.min(100, k.m[m] + ((100 / (fillTime(c, m) * crowd)) * dt) / (asleep ? 2 : 1));
      }
      const crying = this.mood(k) === 'cry';
      if (crying !== k.crying) {
        k.crying = crying;
        if (crying) { k.cryLossAt = s.t + 20; events.push({ type: 'startCry', kid: k.id }); }
      }
      if (crying) {
        // Crying with nobody coming costs half a heart every 20 minutes.
        if (s.t >= k.cryLossAt) { k.hearts = Math.max(0, k.hearts - 0.5); k.cryLossAt = s.t + 20; }
      }
      // Too tired and nobody put them to bed: they nod off where they are.
      if (!asleep && !this.busy(k) && k.m.tired >= 100) {
        k.sleepUntil = s.t + 40;
        k.floorNap = true;
        k.hearts = Math.max(0, k.hearts - 0.5);
        events.push({ type: 'doze', kid: k.id });
        continue;
      }
      if (!asleep && !this.busy(k) && s.t >= k.nextMoveAt) {
        k.nextMoveAt = s.t + between(this.rng, 8, 20);
        events.push(this.ownIdea(k, c));
      }
    }
    events.push(...this.helpers());
    return events;
  }

  /** A child left to themselves plays with something on their floor, chats to a friend, or wanders. */
  private ownIdea(k: DayKid, c: Child): Event {
    const fun = allowed(c.age).filter((a) => FUN.includes(a) && ACTS[a].floor === k.floor);
    if (fun.length && k.m.fun >= 40 && this.rng() < 0.6) {
      const fav = favourite(c.pers, c.age);
      const act = fun.includes(fav) && this.rng() < 0.5 ? fav : pick(this.rng, fun);
      k.m.fun = Math.max(0, k.m.fun - 35);
      k.busyUntil = this.s.t + 15;
      k.did.push(act);
      return { type: 'selfplay', kid: k.id, act };
    }
    const friends = this.present().filter((o) => o !== k && o.floor === k.floor && !this.asleep(o) && this.child(o.id).age >= 2);
    if (c.age >= 2 && friends.length && this.rng() < 0.3) {
      k.m.love = Math.max(0, k.m.love - 10);
      return { type: 'chat', kid: k.id, with: pick(this.rng, friends).id };
    }
    return { type: 'wander', kid: k.id };
  }

  /** Helpers each see to one need every 15 minutes; Emily helps downstairs every 35 when the desk is quiet. */
  private helpers(): Event[] {
    const s = this.s;
    const events: Event[] = [];
    const neediest = (ok: (act: Act, k: DayKid) => boolean) => this.present()
      .filter((k) => this.need(k) && !this.busy(k) && ok(this.needAct(k), k))
      .sort((a, b) => Math.max(...METERS.map((m) => b.m[m])) - Math.max(...METERS.map((m) => a.m[m])))[0];
    type Who = { id: HelperId | 'own' | 'emily'; ok: (act: Act, k: DayKid) => boolean; every: number };
    const who: Who[] = this.w.helpers.map((h) => ({ id: h, ok: (act: Act) => HELPERS[h].acts.includes(act), every: 15 }));
    if (ownIsHelper(this.w)) who.push({ id: 'own', ok: () => true, every: 15 });
    who.push({ id: 'emily', ok: (act, k) => k.floor === 'down' && ACTS[act].floor === 'down', every: 35 });
    for (const { id, ok, every } of who) {
      if (s.t < (s.next[id] ?? 0)) continue;
      if (id === 'emily' && s.queue.length) continue;
      const k = neediest(ok);
      if (!k) continue;
      const act = this.needAct(k);
      this.meet(k, act, true);
      s.next[id] = s.t + every;
      events.push({ type: 'helper', helper: id, kid: k.id, act });
    }
    return events;
  }

  private meet(k: DayKid, act: Act, matched: boolean): boolean {
    const c = this.child(k.id);
    const fav = act === favourite(c.pers, c.age) || (act === 'play' && FUN.includes(favourite(c.pers, c.age)));
    const m = METER_OF[act];
    k.hearts = Math.min(MAX_HEARTS, k.hearts + (matched ? 1 : 0.25) + (fav ? 1 : 0));
    k.m[m] = 0;
    if (m === 'fun') k.m.love = Math.max(0, k.m.love - 20);
    k.did.push(act);
    if (matched) k.laughUntil = this.s.t + 10;
    if (act === 'nap') { k.sleepUntil = this.s.t + (c.age === 0 ? 75 : 60); k.floorNap = false; }
    else k.busyUntil = this.s.t + 12;
    return fav;
  }

  /** Do something with a child. `minAge` is for furniture, which any age from it up can use. */
  act(kidId: number, act: Act, minAge = 0): ActResult {
    const k = this.kid(kidId);
    const c = this.child(kidId);
    if (this.asleep(k)) return { ok: false, why: 'asleep' };
    if (act === 'play') { if (c.age < minAge) return { ok: false, why: 'tooLittle' }; }
    else if (!allowed(c.age).includes(act)) return { ok: false, why: allowed(4).includes(act) && c.age < 3 ? 'tooLittle' : 'tooBig' };
    const matched = k.m[METER_OF[act]] >= 50;
    return { ok: true, matched, fav: this.meet(k, act, matched) };
  }

  dropOff(famId: number) {
    const f = this.fam(famId);
    this.s.queue = this.s.queue.filter((id) => id !== famId);
    f.state = 'in';
    this.w.families.find((x) => x.id === famId)!.visits++;
    for (const id of this.w.families.find((x) => x.id === famId)!.kids) {
      const k = this.kid(id);
      k.here = true;
      for (const m of METERS) k.m[m] = between(this.rng, 0, 35);
      if (this.child(id).pers === 'shy') k.m.love = 70;
      k.nextMoveAt = this.s.t + between(this.rng, 3, 10);
    }
    // Greeted so late that it's already home time: straight back into the queue.
    if (f.leave <= this.s.t) { f.state = 'pick'; this.s.queue.push(famId); }
  }

  /** Home time. The family remembers how the day went, for tomorrow's chat. */
  pickUp(famId: number) {
    this.s.queue = this.s.queue.filter((id) => id !== famId);
    this.fam(famId).state = 'gone';
    const fam = this.w.families.find((x) => x.id === famId)!;
    fam.last = { day: this.s.day, hearts: {} };
    for (const id of fam.kids) {
      const k = this.kid(id);
      fam.last.hearts[id] = k.hearts;
      k.here = false;
      k.sleepUntil = 0;
      k.busyUntil = 0;
    }
  }

  /** ⏩ jumps to the next half hour, but only once everyone at the desk for drop-off has been greeted. */
  canSkip = () => this.s.t < CLOSE && !this.s.queue.some((id) => this.fam(id).state === 'drop');
  skip(): Event[] { return this.canSkip() ? this.advance((Math.floor(this.s.t / 30) + 1) * 30 - this.s.t) : []; }

  done = () => this.s.fams.every((f) => f.state === 'gone');

  /** Emily's hint: the desk first, then whoever needs it most. */
  hint(): string {
    const front = this.s.queue[0];
    if (front !== undefined) {
      const f = this.fam(front);
      const who = `${familyName(this.w, this.w.families.find((x) => x.id === front)!)}'s ${f.parent}`;
      return f.state === 'drop' ? `${who} is at the desk! Tap them to say hello.` : `${who} is here for pick-up! Tap them at the desk.`;
    }
    const k = this.present().filter((k) => this.need(k)).sort((a, b) => Math.max(...METERS.map((m) => b.m[m])) - Math.max(...METERS.map((m) => a.m[m])))[0];
    if (k) {
      const a = ACTS[this.needAct(k)];
      const name = this.child(k.id).name;
      return `${name} ${this.mood(k) === 'cry' ? 'is crying and' : ''} wants ${a.want}! Try the ${a.place} ${a.floor === 'up' ? 'upstairs' : 'downstairs'}.`.replace('  ', ' ');
    }
    if (!this.present().length) return this.s.t < CLOSE ? 'Nobody is here yet. Tap ⏩ to move the clock on.' : 'Everyone has gone home!';
    return 'Everyone is happy! Do something fun with them.';
  }
}

export const clock = (t: number) => {
  const h = Math.floor(t / 60);
  const m = Math.floor(t % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
};
