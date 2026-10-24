// One nursery day: the clock, who is here, what each child needs, the queue at the desk, and the helpers.
import { ACTS, Act, FUN, Floor, HELPERS, HelperId, allowed, favourite } from './catalog';
import { Child, GROWN_UP, OWN, Rng, World, familyName, ownIsHelper, pick } from './world';

export const OPEN = 8 * 60;
export const CLOSE = 17 * 60;
export const MAX_HEARTS = 5;

export type FamState = 'coming' | 'drop' | 'in' | 'pick' | 'gone';
export type DayFam = { id: number; arrive: number; leave: number; parent: 'mum' | 'dad'; state: FamState };
export type Need = { act: Act; since: number };
export type DayKid = {
  id: number; here: boolean; floor: Floor; x: number; y: number; at: string;
  hearts: number; need: Need | null; nextNeedAt: number; sleepUntil: number; did: Act[]; last: Act | null;
};
export type DayState = { day: number; t: number; fams: DayFam[]; kids: DayKid[]; queue: number[] };
export type Event = { type: 'arrive' | 'pickup'; fam: number } | { type: 'helper'; helper: HelperId | 'own'; kid: number; act: Act };
export type ActResult =
  | { ok: false; why: 'asleep' | 'tooLittle' | 'tooBig' }
  | { ok: true; matched: boolean; fav: boolean; events: Event[] };

const between = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));

/** Isabelle's own child is here from the start (until grown up); everyone else comes with a parent. */
const dayKid = (c: Child, t: number): DayKid => ({
  id: c.id, here: c.fam === OWN && c.age < GROWN_UP, floor: c.age === 0 ? 'up' : 'down', x: 0, y: 0, at: '',
  hearts: 3, need: null, nextNeedAt: t + 20, sleepUntil: 0, did: [], last: null,
});

/** Day 1 everyone comes at 8 and stays late; after that drop-offs and pick-ups spread across the day. */
export function newDay(w: World, rng: Rng = Math.random): DayState {
  const fams = w.families.map((f, i): DayFam => ({
    id: f.id, parent: rng() < 0.5 ? 'mum' : 'dad', state: 'coming',
    arrive: w.day === 1 ? OPEN : pick(rng, [480, 480, 480, 540, 600]),
    leave: w.day === 1 ? [960, 1020][i % 2] : pick(rng, [840, 900, 960, 1020, 1020]),
  }));
  const kids = w.children.map((c): DayKid => dayKid(c, OPEN));
  return { day: w.day, t: OPEN, fams, kids, queue: [] };
}

export class Day {
  constructor(public w: World, public s: DayState, private rng: Rng = Math.random) {}

  child = (id: number): Child => this.w.children.find((c) => c.id === id)!;
  kid = (id: number): DayKid => this.s.kids.find((k) => k.id === id)!;
  fam = (id: number): DayFam => this.s.fams.find((f) => f.id === id)!;
  present = (): DayKid[] => this.s.kids.filter((k) => k.here);
  asleep = (k: DayKid) => k.sleepUntil > this.s.t;

  /** Each finished thing moves the clock less when the nursery is busy, so a full room still gets a whole day. */
  step(): number {
    const n = this.present().length;
    return n <= 4 ? 15 : n <= 10 ? 10 : 5;
  }

  start(): Event[] { return this.advance(0); }

  /** Isabelle's new child joins today straight away. */
  addOwn(c: Child) {
    if (!this.s.kids.some((k) => k.id === c.id)) this.s.kids.push(dayKid(c, this.s.t));
  }

  advance(mins: number): Event[] {
    const s = this.s;
    s.t = Math.min(CLOSE, s.t + mins);
    const events: Event[] = [];
    for (const f of s.fams) {
      if (f.state === 'coming' && f.arrive <= s.t) { f.state = 'drop'; s.queue.push(f.id); events.push({ type: 'arrive', fam: f.id }); }
      if (f.state === 'in' && f.leave <= s.t) { f.state = 'pick'; s.queue.push(f.id); events.push({ type: 'pickup', fam: f.id }); }
    }
    for (const k of this.present()) {
      if (k.sleepUntil && !this.asleep(k)) k.sleepUntil = 0;
      if (!k.need && !this.asleep(k) && s.t >= k.nextNeedAt) k.need = { act: this.newNeed(k), since: s.t };
      // A need left for an hour costs half a heart, then again each hour.
      if (k.need && s.t - k.need.since >= 60) { k.hearts = Math.max(0, k.hearts - 0.5); k.need.since = s.t; }
    }
    for (const h of this.w.helpers) {
      const k = this.present()
        .filter((k) => k.need && HELPERS[h].acts.includes(k.need.act) && !this.asleep(k))
        .sort((a, b) => a.need!.since - b.need!.since)[0];
      if (k) { const act = k.need!.act; this.fulfil(k, act, true); events.push({ type: 'helper', helper: h, kid: k.id, act }); }
    }
    // Grown up, Isabelle's child helps with anything: the longest wait first.
    if (ownIsHelper(this.w)) {
      const k = this.present().filter((k) => k.need && !this.asleep(k)).sort((a, b) => a.need!.since - b.need!.since)[0];
      if (k) { const act = k.need!.act; this.fulfil(k, act, true); events.push({ type: 'helper', helper: 'own', kid: k.id, act }); }
    }
    return events;
  }

  private newNeed(k: DayKid): Act {
    const c = this.child(k.id);
    const fav = favourite(c.pers, c.age);
    const options = allowed(c.age).filter((a) => a !== k.last).flatMap((a) => {
      if (a === fav) return [a, a, a];
      if (c.age >= 3 && (a === 'nap' || a === 'cuddle')) return [];
      return [a];
    });
    return pick(this.rng, options.length ? options : [fav]);
  }

  private fulfil(k: DayKid, act: Act, matched: boolean) {
    const c = this.child(k.id);
    const fav = act === favourite(c.pers, c.age) || (act === 'play' && FUN.includes(favourite(c.pers, c.age)));
    k.hearts = Math.min(MAX_HEARTS, k.hearts + (matched ? 1 : 0.5) + (fav ? 1 : 0));
    k.did.push(act);
    if (matched) { k.last = k.need!.act; k.need = null; k.nextNeedAt = this.s.t + between(this.rng, 30, 70); }
    if (act === 'nap') {
      k.sleepUntil = this.s.t + 60;
      k.nextNeedAt = Math.max(k.nextNeedAt, k.sleepUntil + between(this.rng, 10, 30));
    }
    return fav;
  }

  /** Do something with a child. `minAge` is for furniture, which any age from it up can use. */
  act(kidId: number, act: Act, minAge = 0): ActResult {
    const k = this.kid(kidId);
    const c = this.child(kidId);
    if (this.asleep(k)) return { ok: false, why: 'asleep' };
    if (act === 'play') { if (c.age < minAge) return { ok: false, why: 'tooLittle' }; }
    else if (!allowed(c.age).includes(act)) return { ok: false, why: allowed(4).includes(act) && c.age < 3 ? 'tooLittle' : 'tooBig' };
    const matched = !!k.need && (k.need.act === act || (act === 'play' && FUN.includes(k.need.act)));
    const fav = this.fulfil(k, act, matched);
    return { ok: true, matched, fav, events: this.advance(this.step()) };
  }

  dropOff(famId: number) {
    const f = this.fam(famId);
    this.s.queue = this.s.queue.filter((id) => id !== famId);
    f.state = 'in';
    this.w.families.find((x) => x.id === famId)!.visits++;
    for (const id of this.w.families.find((x) => x.id === famId)!.kids) {
      const k = this.kid(id);
      const c = this.child(id);
      k.here = true;
      k.nextNeedAt = this.s.t + between(this.rng, 10, 40);
      if (c.pers === 'shy') k.need = { act: 'cuddle', since: this.s.t };
    }
    // Greeted so late that it's already home time: straight back into the queue.
    if (f.leave <= this.s.t) { f.state = 'pick'; this.s.queue.push(famId); }
  }

  pickUp(famId: number) {
    this.s.queue = this.s.queue.filter((id) => id !== famId);
    this.fam(famId).state = 'gone';
    for (const id of this.w.families.find((x) => x.id === famId)!.kids) {
      const k = this.kid(id);
      k.here = false;
      k.need = null;
      k.sleepUntil = 0;
    }
  }

  /** ⏩ moves to the next half hour, but only once everyone at the desk for drop-off has been greeted. */
  canSkip = () => this.s.t < CLOSE && !this.s.queue.some((id) => this.fam(id).state === 'drop');
  skip(): Event[] { return this.canSkip() ? this.advance((Math.floor(this.s.t / 30) + 1) * 30 - this.s.t) : []; }

  done = () => this.s.fams.every((f) => f.state === 'gone');

  /** Emily's hint: the desk first, then whoever has waited longest. */
  hint(): string {
    const front = this.s.queue[0];
    if (front !== undefined) {
      const f = this.fam(front);
      const who = `${familyName(this.w, this.w.families.find((x) => x.id === front)!)}'s ${f.parent}`;
      return f.state === 'drop' ? `${who} is at the desk! Tap them to say hello.` : `${who} is here for pick-up! Tap them at the desk.`;
    }
    const waiting = this.present().filter((k) => k.need && !this.asleep(k)).sort((a, b) => a.need!.since - b.need!.since)[0];
    if (waiting) {
      const a = ACTS[waiting.need!.act];
      return `${this.child(waiting.id).name} wants ${a.want}! Try the ${a.place} ${a.floor === 'up' ? 'upstairs' : 'downstairs'}.`;
    }
    if (!this.present().length) return this.s.t < CLOSE ? 'Nobody is here yet. Tap ⏩ to move the clock on.' : 'Everyone has gone home!';
    return 'Everyone is happy! Do something fun, or tap ⏩.';
  }
}

export const clock = (t: number) => {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
};
