// Screens: start, the nursery (two painted floors), chats at the desk, the wardrobe, having a child, and the end of the day.
import './style.css';
import { ACTS, Act, FURNITURE, Floor, HELPERS, HelperId, PERSONALITIES, Personality, favourite } from './game/catalog';
import { CLOSE, Day, DayKid, Event, MAX_HEARTS, METERS, METER_INFO, SPEED, WANT, Wish, clock, newDay } from './game/day';
import { HAIR, HAIR_COLOURS, ITEM, Kind, Look, NEEDED, SKIN_TONES, SLOTS, SLOT_LABEL, Slot, itemsFor, kindOf, randomLook, regrow } from './game/looks';
import { load, save, wipe } from './game/save';
import { checkTip, didLabel, heartsLine, hello, homeTalk, reaction, smallTalk, tip, tipAnswer, tipMore, yesterday } from './game/talk';
import { Child, Family, GROWN_UP, NewChild, OWN, Reward, World, earnsReward, familyName, haveChild, matchFamilies, newWorld, nextDay, ownChild, ownIsHelper, rewardChoices, takeReward, unlockSome } from './game/world';
import { Mood, doll, dollBox, lyingDoll, sprite } from './ui/dolls';
import { DOOR, EMILY_SPOT, FRONTS, HOME_SPOT, PLAY_AREA, QUEUE, ROOM_H, ROOM_W, SIZES, STATIONS, Station, furnitureStations } from './ui/room';
import { actSound, setMuted, sfx, startMusic } from './ui/sound';

const store = (() => { try { return window.localStorage; } catch { return null; } })();
const app = document.getElementById('app')!;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

let w: World;
let day: Day;
let view: Floor = 'down';
let sel: number | null = null;
let busy = false;
const me: Record<Floor, { x: number; y: number }> = { down: { x: HOME_SPOT.down[0], y: HOME_SPOT.down[1] }, up: { x: HOME_SPOT.up[0], y: HOME_SPOT.up[1] } };
const HELPER_SPOTS: Record<Floor, [number, number][]> = { down: [[520, 640], [770, 650], [400, 655], [660, 645]], up: [[470, 705], [1010, 700], [760, 705], [330, 730]] };

function persist() { save(store, { world: w, today: day?.s ?? null }); }
const famOf = (id: number): Family => w.families.find((f) => f.id === id)!;
const stations = (): Station[] => [...STATIONS, ...furnitureStations(w.furniture)];

// ---------- layout ----------

app.innerHTML = `<div id="stage">
  <main class="room">
    <img class="bg" data-floor="down" src="art/room-down.webp" alt=""><img class="bg" data-floor="up" src="art/room-up.webp" alt="">
    <div class="zones"></div><div class="people"></div><div class="light"></div><div class="fx"></div>
  </main>
  <aside class="hud">
    <div class="dayno"></div>
    <div class="clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#ffb3c8" stroke-width="6"/>
      ${Array.from({ length: 12 }, (_, i) => `<circle cx="${50 + 36 * Math.sin((i * Math.PI) / 6)}" cy="${50 - 36 * Math.cos((i * Math.PI) / 6)}" r="${i % 3 ? 2 : 3.5}" fill="#c7bcef"/>`).join('')}
      <line class="hh" x1="50" y1="50" x2="50" y2="28" stroke="#3d3a5c" stroke-width="5" stroke-linecap="round"/>
      <line class="mh" x1="50" y1="50" x2="50" y2="17" stroke="#ff7fa0" stroke-width="3.5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#3d3a5c"/></svg></div>
    <div class="time"></div>
    <button class="skip">⏩ Later</button>
    <div class="desk-note"></div>
  </aside>
  <div class="wishes"></div>
  <aside class="card" hidden></aside>
  <div class="say"><div class="face"></div><p></p><button class="baby">👶 Have a child</button><button class="mute icon" aria-label="Sound off">🔊</button></div>
  <div class="modal" hidden></div>
</div>`;

const stage = app.querySelector<HTMLElement>('#stage')!;
const room = app.querySelector<HTMLElement>('.room')!;
const zonesEl = app.querySelector<HTMLElement>('.zones')!;
const peopleEl = app.querySelector<HTMLElement>('.people')!;
const fxEl = app.querySelector<HTMLElement>('.fx')!;
const modal = app.querySelector<HTMLElement>('.modal')!;

function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

/** Tap zones over the painting: invisible, with a small label so a child knows what each thing is. */
function drawZones() {
  zonesEl.innerHTML = stations().map((s) => {
    const [x0, y0, x1, y1] = s.zone;
    const art = s.kind === 'furn' ? `<img src="art/rewards/${s.id.slice(5)}.webp" alt="">` : '';
    return `<button class="st ${s.kind ? `st-${s.kind}` : ''}" data-st="${s.id}" data-floor="${s.floor}" ${s.act ? `data-act="${s.act}"` : ''} aria-label="${esc(s.label)}"
      style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px">${art}<span class="label">${s.label}</span><span class="badge" hidden></span></button>`;
  }).join('');
}

room.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const p = t.closest<HTMLElement>('.p');
  if (p) {
    if (p.dataset.kid) return tapKid(Number(p.dataset.kid));
    if (p.dataset.fam || p.classList.contains('emily')) return tapDesk(!!p.dataset.fam);
  }
  const st = t.closest<HTMLElement>('.st');
  if (st) tapStation(stations().find((s) => s.id === st.dataset.st)!);
});

// ---------- talking ----------

function say(who: 'isabelle' | 'emily', text: string) {
  const bar = app.querySelector('.say')!;
  const face = bar.querySelector<HTMLElement>('.face')!;
  face.innerHTML = who === 'emily' ? sprite('staff/emily', SIZES.staff.emily, 300) : doll(w.isabelle, 'adult');
  face.dataset.who = who;
  bar.querySelector('p')!.innerHTML = `<b>${who === 'emily' ? 'Emily' : 'Isabelle'}:</b> ${esc(text)}`;
  bar.classList.remove('flash');
  void (bar as HTMLElement).offsetWidth;
  bar.classList.add('flash');
}

function fx(text: string, x: number, y: number, cls = '') {
  const s = document.createElement('span');
  s.className = `pop ${cls}`;
  s.textContent = text;
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  fxEl.appendChild(s);
  setTimeout(() => s.remove(), 1300);
}

// ---------- drawing people ----------

/** Real-time bits the rules don't need: who is chatting, who is mid-walk, where Emily has gone. */
const chatting = new Map<number, number>();
const lastPos = new Map<string, string>();
let emilyTrip: { x: number; y: number; back: number; home: number } | null = null;
let lastCrySound = 0;
let lastCryNote = 0;

/** Further back in the room, a little smaller. */
const depth = (y: number) => 0.82 + (0.18 * Math.max(0, Math.min(200, y - 560))) / 200;

function el(key: string, art: () => string, artKey: string, cls: string): HTMLElement {
  let e = peopleEl.querySelector<HTMLElement>(`[data-key="${key}"]`);
  if (!e) {
    e = document.createElement('div');
    e.dataset.key = key;
    peopleEl.appendChild(e);
    e.innerHTML = `<div class="art"></div><div class="hit"></div><div class="bubble" hidden></div><div class="tag"></div>`;
  }
  e.className = `p ${cls}`;
  if (e.dataset.art !== artKey) { e.querySelector('.art')!.innerHTML = art(); e.dataset.art = artKey; }
  return e;
}

/** Position a person by their feet; a change of spot makes them walk there. `box` is [width, height, feet offset]. */
function place(e: HTMLElement, x: number, y: number, box: [number, number, number], floor: Floor, z = y) {
  const key = e.dataset.key!;
  const pos = `${Math.round(x)},${Math.round(y)}`;
  if (lastPos.get(key) !== pos) {
    if (lastPos.has(key)) e.dataset.walkTill = String(performance.now() + 900);
    lastPos.set(key, pos);
  }
  e.classList.toggle('walking', Number(e.dataset.walkTill ?? 0) > performance.now());
  const [bw, bh, feet] = box;
  e.style.width = `${bw}px`;
  e.style.height = `${bh}px`;
  e.style.transform = `translate(${x - bw / 2}px, ${y - bh + feet}px)`;
  e.style.zIndex = String(Math.round(z));
  e.classList.toggle('away', floor !== view);
}

function homeSpot(k: DayKid) {
  const a = PLAY_AREA[k.floor];
  const others = day.present().filter((o) => o !== k && o.floor === k.floor && o.x);
  let best = { x: 0, y: 0, gap: -1 };
  for (let i = 0; i < 12; i++) {
    const x = rand(a.x[0], a.x[1]);
    const y = rand(a.y[0], a.y[1]);
    const gap = Math.min(999, ...others.map((o) => Math.hypot(o.x - x, (o.y - y) * 2)));
    if (gap > best.gap) best = { x, y, gap };
  }
  k.x = best.x;
  k.y = best.y;
  k.at = '';
  makeRoom(k);
}

/** Step aside from anyone already standing here, so no child ever hides right behind another. */
function makeRoom(k: DayKid) {
  const others = day.present().filter((o) => o !== k && o.floor === k.floor && o.x && !o.at.startsWith('bed:'));
  const x0 = k.x;
  for (let i = 1; i <= 8 && others.some((o) => Math.abs(o.x - k.x) < 60 && Math.abs(o.y - k.y) < 40); i++) {
    k.x = Math.max(70, Math.min(1150, x0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 62));
  }
}

const lookKey = (l: Look) => `${l.skin}|${l.hair}|${l.hairColor}|${Object.values(l.outfit).join(',')}`;
const bedOf = (k: DayKid) => (k.at.startsWith('bed:') ? stations().flatMap((s) => s.beds ?? []).find((b) => b.id === k.at.slice(4)) ?? null : null);

function render() {
  const s = day.s;
  const now = performance.now();
  app.querySelector('.dayno')!.textContent = `Day ${w.day}`;
  app.querySelector('.time')!.textContent = clock(s.t);
  app.querySelector('.hh')!.setAttribute('transform', `rotate(${((s.t / 60) % 12) * 30} 50 50)`);
  app.querySelector('.mh')!.setAttribute('transform', `rotate(${(s.t % 60) * 6} 50 50)`);
  app.querySelector('.skip')!.classList.toggle('off', !day.canSkip());
  room.style.setProperty('--dusk', String(Math.max(0, Math.min(1, (s.t - 900) / 120))));
  const waiting = s.queue.length;
  app.querySelector('.desk-note')!.innerHTML = waiting ? `🔔 ${waiting} at the desk` : `👶 ${day.present().length} here`;
  room.querySelectorAll<HTMLElement>('.bg, .st').forEach((f) => f.classList.toggle('show', f.dataset.floor === view));
  drawWishes();

  const seen = new Set<string>();
  const mark = (e: HTMLElement) => { seen.add(e.dataset.key!); return e; };

  // Front pieces of the painting (cots, desk, chest), layered with people by depth.
  for (const f of ['down', 'up'] as Floor[]) {
    for (const fr of FRONTS[f]) {
      const key = `front-${f}-${fr.id}`;
      let e = peopleEl.querySelector<HTMLElement>(`[data-key="${key}"]`);
      if (!e) {
        e = document.createElement('img');
        e.dataset.key = key;
        e.className = 'front';
        (e as HTMLImageElement).src = `art/${key}.webp`;
        e.setAttribute('style', `left:${fr.x}px;top:${fr.y}px;width:${fr.w}px;height:${fr.h}px;z-index:${fr.z}`);
        peopleEl.appendChild(e);
      }
      e.classList.toggle('away', f !== view);
      seen.add(key);
    }
  }

  // Isabelle.
  const isa = mark(el('isabelle', () => doll(w.isabelle, 'adult'), lookKey(w.isabelle), 'isabelle'));
  place(isa, me[view].x, me[view].y, dollBox('adult', 300 * depth(me[view].y)), view);
  isa.querySelector('.tag')!.textContent = 'Isabelle';

  // Emily: behind the desk, or out helping a child.
  if (emilyTrip && now > emilyTrip.home) emilyTrip = null;
  const atDesk = !emilyTrip || now > emilyTrip.back;
  const em = mark(el('emily', () => sprite('staff/emily', SIZES.staff.emily, 300), 'emily', 'emily'));
  const [ex, ey] = !emilyTrip ? EMILY_SPOT : atDesk ? [EMILY_SPOT[0] + 60, 640] : [emilyTrip.x, emilyTrip.y];
  const eh = 300 * (emilyTrip ? depth(ey) : 1);
  place(em, ex, ey, [(eh * SIZES.staff.emily[0]) / SIZES.staff.emily[1], eh, 0], 'down');
  em.querySelector('.tag')!.textContent = 'Emily';

  // The line at the desk, front first.
  s.queue.forEach((famId, i) => {
    const f = day.fam(famId);
    const src = famOf(famId)[f.parent];
    const size = SIZES.parents[src];
    const e = mark(el(`fam${famId}`, () => sprite(`parents/${src}`, size, 300), src, `parent ${i === 0 ? 'front' : ''}`));
    e.dataset.fam = String(famId);
    const [qx, qy] = QUEUE[Math.min(i, QUEUE.length - 1)];
    const h = 300 * depth(qy);
    const box: [number, number, number] = [(h * size[0]) / size[1], h, 0];
    if (!e.dataset.placed) { place(e, DOOR[0], DOOR[1], box, 'down'); e.dataset.placed = '1'; void e.offsetWidth; }
    place(e, qx, qy, box, 'down', i === 0 ? qy + 400 : qy);
    e.classList.toggle('more', i >= QUEUE.length);
    e.querySelector('.tag')!.textContent = `${familyName(w, famOf(famId))}'s ${f.parent}`;
    const b = e.querySelector<HTMLElement>('.bubble')!;
    b.hidden = i !== 0;
    b.textContent = f.state === 'drop' ? '👋' : '🏠';
  });

  // Helpers.
  const used: Record<Floor, number> = { down: 0, up: 0 };
  for (const hId of w.helpers) {
    const hp = HELPERS[hId];
    const [x, y] = HELPER_SPOTS[hp.floor][used[hp.floor]++];
    const size = SIZES.helpers[hId];
    const h = 300 * depth(y);
    const e = mark(el(`helper-${hId}`, () => sprite(`helpers/${hId}`, size, h), `${hId}${h}`, 'helper'));
    place(e, x, y, [(h * size[0]) / size[1], h, 0], hp.floor);
    e.querySelector('.tag')!.textContent = `${hp.e} ${hp.name}`;
  }
  const own = ownChild(w);
  if (own && ownIsHelper(w)) {
    const [x, y] = HELPER_SPOTS.down[used.down];
    const e = mark(el('own-helper', () => doll(own, own.age), lookKey(own), 'helper'));
    place(e, x, y, dollBox(own.age, 300 * depth(y)), 'down');
    e.querySelector('.tag')!.textContent = `💖 ${own.name} (helper)`;
  }
  app.querySelector<HTMLElement>('.baby')!.hidden = !!own;

  // Children.
  for (const k of s.kids) {
    if (!k.here) continue;
    const c = day.child(k.id);
    const asleep = day.asleep(k);
    if (!asleep && (k.at.startsWith('bed:') || k.floorNap)) { k.floorNap = false; homeSpot(k); }
    if (!k.x) homeSpot(k);
    const mood: Mood = day.mood(k);
    const bed = asleep ? bedOf(k) : null;
    const lying = asleep && (!!bed || k.floorNap);
    const length = bed ? bed.length : 150;
    const e = mark(el(`kid${k.id}`, () => (lying ? lyingDoll(c, c.age, length) : doll(c, c.age, mood)), `${lookKey(c)}|${c.age}|${mood}|${lying ? length : ''}`,
      `kid ${sel === k.id ? 'sel' : ''} ${lying ? 'lying' : ''} ${mood}`));
    e.dataset.kid = String(k.id);
    const need = day.need(k);
    if (lying) {
      const [bw, bh] = dollBox(c.age, length);
      place(e, bed ? bed.x : k.x, bed ? bed.y : k.y, [bh, bw, 0], k.floor, bed ? bed.z : k.y);
    } else {
      const [bw, bh, feet] = dollBox(c.age);
      const sc = depth(k.y);
      // Layered by depth only: children step aside from each other (makeRoom), and furniture fronts stay in front.
      place(e, k.x, k.y, [bw * sc, bh * sc, feet * sc], k.floor, k.y);
    }
    e.querySelector('.tag')!.textContent = `${c.fam === OWN ? '💖' : ''}${PERSONALITIES[c.pers].e} ${c.name}`;
    const b = e.querySelector<HTMLElement>('.bubble')!;
    const talking = (chatting.get(k.id) ?? 0) > now;
    b.hidden = !need && !asleep && !talking;
    b.textContent = asleep ? '💤' : need ? ACTS[day.needAct(k)].e : '💬';
    b.dataset.need = asleep || !need ? '' : day.needAct(k);
    b.classList.toggle('late', mood === 'cry');
  }

  peopleEl.querySelectorAll<HTMLElement>('[data-key]').forEach((e) => { if (!seen.has(e.dataset.key!)) { lastPos.delete(e.dataset.key!); e.remove(); } });

  // Stairs show what's waiting on the other floor.
  for (const st of ['stairsUp', 'stairsDown']) {
    const other: Floor = st === 'stairsUp' ? 'up' : 'down';
    const needs = day.present().filter((k) => k.floor === other && day.need(k)).length;
    const desk = other === 'down' && waiting > 0;
    const badge = room.querySelector<HTMLElement>(`[data-st="${st}"] .badge`)!;
    badge.hidden = !needs && !desk;
    badge.textContent = `${desk ? '🔔' : ''}${needs ? ` ${needs} ❗` : ''}`.trim();
  }
  sideCard();
}

function hearts(n: number) {
  return Array.from({ length: MAX_HEARTS }, (_, i) => `<i class="${n >= i + 1 ? 'on' : n >= i + 0.5 ? 'half' : ''}">♥</i>`).join('');
}

function sideCard() {
  const card = app.querySelector<HTMLElement>('.card')!;
  if (sel === null || !day.kid(sel).here) { sel = null; card.hidden = true; return; }
  card.hidden = false;
  const k = day.kid(sel);
  const c = day.child(sel);
  const need = day.need(k);
  const want = day.asleep(k) ? '💤 Asleep' : need ? `${ACTS[day.needAct(k)].e} Wants ${ACTS[day.needAct(k)].want}` : '😊 Happy';
  card.innerHTML = `<b>${esc(c.name)}</b>
    <small>${c.fam === OWN ? '💖 My child · ' : ''}${c.age === 0 ? 'Newborn' : `Age ${c.age}`} · ${PERSONALITIES[c.pers].e} ${PERSONALITIES[c.pers].label}</small>
    <div class="hearts">${hearts(k.hearts)}</div>
    <div class="meters">${METERS.filter((m) => m !== 'fun' || c.age > 0).map((m) => `<div class="meter ${k.m[m] >= WANT ? 'hi' : ''}"><span>${METER_INFO[m].e}</span><i style="width:${Math.round(k.m[m])}%"></i></div>`).join('')}</div>
    <small class="want">${want}</small>`;
}

function drawWishes() {
  const box = app.querySelector<HTMLElement>('.wishes')!;
  const html = day.s.wishes.map((wi) => `<div class="wish ${wi.got >= wi.target ? 'wish-done' : ''}">${wi.got >= wi.target ? '✅' : '⭐'} ${esc(wi.text)} <small>${Math.min(wi.got, wi.target)}/${wi.target}</small></div>`).join('');
  if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
}

/** A wish just came true: a new piece of clothing for the wardrobe. */
function wishesDone(done: Wish[]) {
  for (const wi of done) {
    const [item] = unlockSome(w, 1);
    sfx.cheer();
    fx('⭐', 688, 120, 'heart');
    say('emily', `Wish come true: ${wi.text}! ${item ? `New in the wardrobe: ${item.name}!` : 'Well done!'}`);
  }
}

// ---------- taps in the room ----------

function tapKid(id: number) {
  if (busy) return;
  sfx.pop();
  sel = sel === id ? null : id;
  if (sel !== null) {
    const k = day.kid(id);
    const c = day.child(id);
    const need = day.need(k);
    if (day.asleep(k)) say('isabelle', `Shh! ${c.name} is asleep.`);
    else if (need) {
      const a = ACTS[day.needAct(k)];
      const crying = day.mood(k) === 'cry' ? `${c.name} is crying! ` : '';
      say('isabelle', `${crying}${c.name} wants ${a.want}. Tap the ${a.place}${a.floor !== view ? ` ${a.floor === 'up' ? 'upstairs' : 'downstairs'}` : ''}.`);
    } else say('isabelle', `${c.name} is happy! Let's do something fun.`);
  }
  render();
}

function tapStation(st: Station) {
  if (busy) return;
  if (st.kind === 'stairs') return switchFloor();
  if (st.kind === 'wardrobe') { sfx.pop(); return openWardrobe(sel ?? undefined); }
  if (st.kind === 'desk') return tapDesk(true);
  if (sel === null) { sfx.nope(); say('isabelle', 'Tap a child first!'); return; }
  doAct(sel, st);
}

function switchFloor() {
  sfx.pop();
  view = view === 'down' ? 'up' : 'down';
  const stairs = STATIONS.find((s) => s.kind === 'stairs' && s.floor === view)!;
  me[view] = { x: stairs.kx - 40, y: stairs.ky };
  if (sel !== null) {
    const k = day.kid(sel);
    k.floor = view;
    k.at = '';
    k.x = stairs.kx - 110;
    k.y = stairs.ky - 10;
    say('isabelle', `Come on, ${day.child(sel).name}! ${view === 'up' ? 'Up' : 'Down'} we go!`);
  }
  persist();
  render();
}

/** A free bed in this cot station (else any cot), or null when they're all taken. */
function freeBed(st?: Station) {
  const taken = new Set(day.present().filter((k) => day.asleep(k) && k.at.startsWith('bed:')).map((k) => k.at.slice(4)));
  const all = stations().flatMap((s) => s.beds ?? []);
  return (st?.beds ?? []).find((b) => !taken.has(b.id)) ?? all.find((b) => !taken.has(b.id)) ?? null;
}

/** Children at the same thing stand side by side, never on top of each other; nappers go to a bed. */
function moveKidTo(k: DayKid, st: Station) {
  k.floor = st.floor;
  if (st.act === 'nap') {
    const bed = freeBed(st);
    if (bed) { k.at = `bed:${bed.id}`; k.x = bed.x; k.y = bed.y; return; }
    k.floorNap = true; // every cot taken: a nap on the mat
  }
  k.at = st.id;
  k.x = st.kx;
  k.y = st.ky;
  makeRoom(k);
}

const stationFor = (act: Act, floor?: Floor) => {
  const options = stations().filter((s) => s.act === act && (!floor || s.floor === floor));
  return options[Math.floor(Math.random() * options.length)];
};

function doAct(id: number, st: Station) {
  const c = day.child(id);
  if (st.act === 'nap' && !freeBed(st)) { sfx.nope(); say('isabelle', 'All the cots are full! Wait for someone to wake up.'); return; }
  const r = day.act(id, st.act!, st.minAge ?? 0);
  if (!r.ok) {
    sfx.nope();
    say('isabelle', r.why === 'asleep' ? `Shh! ${c.name} is asleep.` : r.why === 'tooLittle' ? `${c.name} is too little for that!` : `${c.name} is too big for that!`);
    return;
  }
  const k = day.kid(id);
  moveKidTo(k, st);
  me[view] = { x: Math.min(1180, st.kx + 90), y: Math.max(st.ky + 40, 640) };
  sel = null;
  actSound(st.act!);
  fx(ACTS[st.act!].e, k.x, k.y - 200);
  if (r.matched || r.fav) setTimeout(() => fx(r.fav ? '💖💖' : '💖', k.x, k.y - 160, 'heart'), 250);
  say('isabelle', r.fav ? `${c.name} loved that! It's the favourite!` : r.matched ? `Yay! ${c.name} feels much better.` : `${c.name} had fun!`);
  wishesDone(r.wishes);
  persist();
  render();
}

function handleEvents(events: Event[]) {
  const now = performance.now();
  for (const ev of events) {
    if (ev.type === 'arrive' || ev.type === 'pickup') {
      sfx.ding();
      const f = day.fam(ev.fam);
      const who = `${familyName(w, famOf(ev.fam))}'s ${f.parent}`;
      say('emily', ev.type === 'arrive' ? `Ding dong! ${who} is at the desk.` : `${who} is here for pick-up!`);
      continue;
    }
    const k = day.kid(ev.kid);
    if (ev.type === 'helper') {
      moveKidTo(k, stationFor(ev.act));
      if (k.floor === view) setTimeout(() => fx(ACTS[ev.act].e, k.x, k.y - 200), 300);
      if (ev.helper === 'emily') {
        emilyTrip = { x: k.x + 80, y: k.y + 10, back: now + 3500, home: now + 4500 };
        say('emily', `I'll help ${day.child(k.id).name} with ${ACTS[ev.act].want.replace(/^(a |an |to |the )/, '')}!`);
      }
    } else if (ev.type === 'selfplay') {
      if (sel !== k.id) moveKidTo(k, stationFor(ev.act, k.floor));
    } else if (ev.type === 'wander') {
      if (sel === k.id) continue;
      if (day.child(k.id).age === 0) {
        // Babies shuffle a little way across the mat.
        const a = PLAY_AREA[k.floor];
        k.x = Math.max(a.x[0], Math.min(a.x[1], (k.x || a.x[0]) + rand(-70, 70)));
        k.y = Math.max(a.y[0], Math.min(a.y[1], (k.y || a.y[0]) + rand(-20, 20)));
        k.at = '';
        makeRoom(k);
      } else homeSpot(k);
    } else if (ev.type === 'chat') {
      chatting.set(ev.kid, now + 2500);
      chatting.set(ev.with, now + 2500);
    } else if (ev.type === 'doze') {
      if (sel === k.id) sel = null;
      if (k.floor === view) fx('💤', k.x, k.y - 80);
    } else if (ev.type === 'startCry') {
      if (now - lastCrySound > 4000) { sfx.cry(); lastCrySound = now; }
      if (k.floor !== view && now - lastCryNote > 20000) {
        lastCryNote = now;
        say('emily', `${day.child(k.id).name} is crying ${k.floor === 'up' ? 'upstairs' : 'downstairs'}!`);
      }
    }
  }
}

function tapDesk(parent: boolean) {
  if (busy) return;
  const front = day.s.queue[0];
  if (parent && front !== undefined) {
    if (view !== 'down') return;
    void (day.fam(front).state === 'drop' ? dropChat(front) : pickChat(front));
    return;
  }
  sfx.pop();
  say('emily', day.hint());
}

app.querySelector('.skip')!.addEventListener('click', () => {
  if (busy) return;
  if (!day.canSkip()) { sfx.nope(); say('emily', day.s.t >= CLOSE ? "It's home time! Parents are at the desk." : 'Say hello at the desk first!'); return; }
  sfx.pop();
  handleEvents(day.skip());
  persist();
  render();
});

app.querySelector('.mute')!.addEventListener('click', (e) => {
  w.muted = !w.muted;
  setMuted(w.muted);
  const b = e.currentTarget as HTMLElement;
  b.textContent = w.muted ? '🔇' : '🔊';
  b.setAttribute('aria-label', w.muted ? 'Sound on' : 'Sound off');
  persist();
});

// ---------- the clock runs by itself ----------

let started = false;
let lastTick = performance.now();
let lastSave = 0;
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(1, (now - lastTick) / 1000);
  lastTick = now;
  // Chats, the wardrobe and a hidden tab all pause the day.
  if (!started || !modal.hidden || document.hidden || day.done()) return;
  handleEvents(day.advance(SPEED * dt));
  render();
  if (now - lastSave > 4000) { persist(); lastSave = now; }
  checkEnd();
}, 250);

// ---------- chats ----------

function openChat(parent: string, kids: Child[], who: string) {
  modal.hidden = false;
  modal.innerHTML = `<div class="chat">
    <div class="scene">
      <div class="side-a"><div class="big">${sprite(`parents/${parent}`, SIZES.parents[parent], 290)}</div>${kids.map((c) => `<div class="small">${doll(c, c.age, 'happy', c.age === 0 ? 110 : 150)}<span>${esc(c.name)}</span></div>`).join('')}</div>
      <div class="speech"><b>${esc(who)}</b><p></p></div>
      <div class="side-b"><div class="big">${doll(w.isabelle, 'adult', 'happy', 290)}</div></div>
    </div>
    <div class="choices"></div></div>`;
}

function ask(text: string, choices: string[]): Promise<number> {
  modal.querySelector('.speech p')!.textContent = text;
  const box = modal.querySelector('.choices')!;
  box.innerHTML = choices.map((c, i) => `<button class="choice" data-i="${i}">${esc(c)}</button>`).join('');
  return new Promise((res) => box.querySelectorAll<HTMLElement>('.choice').forEach((b) => b.addEventListener('click', () => { sfx.pop(); res(Number(b.dataset.i)); })));
}

function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

async function dropChat(famId: number) {
  busy = true;
  const fam = famOf(famId);
  const f = day.fam(famId);
  const kids = fam.kids.map(day.child);
  const names = familyName(w, fam);
  openChat(fam[f.parent], kids, `${names}'s ${f.parent}`);
  const first = fam.visits === 0;
  await ask(hello(kids, first), first ? ['Hello! 👋', 'Welcome! 😊'] : ['Good morning! ☀️', 'Hi! 👋']);
  if (fam.last && fam.last.day === w.day - 1) {
    for (const c of kids) { const line = yesterday(c, fam.last.hearts[c.id]); if (line) await ask(line, ['😊']); }
  }
  if (!first) await ask(smallTalk(Math.random), ['Oh wow! 😮', 'Have a good day! 👋']);
  for (const c of kids) if ((await ask(tip(c), ['Got it! 👍', 'Tell me more'])) === 1) await ask(tipMore(c), ['Got it! 👍']);
  await ask(`Pick-up is at ${clock(f.leave)}. Bye bye, ${names}!`, ['See you later! 👋']);
  closeModal();
  day.dropOff(famId);
  for (const c of kids) {
    const k = day.kid(c.id);
    k.floor = c.age === 0 ? 'up' : 'down';
    homeSpot(k);
  }
  sfx.giggle();
  const babies = kids.filter((c) => c.age === 0).map((c) => c.name);
  say('emily', babies.length ? `${babies.join(' and ')} ${babies.length > 1 ? 'are' : 'is'} upstairs in the baby room.` : `${names} ${kids.length > 1 ? 'are' : 'is'} in! Have fun!`);
  busy = false;
  persist();
  render();
}

async function pickChat(famId: number) {
  busy = true;
  const fam = famOf(famId);
  const f = day.fam(famId);
  const kids = fam.kids.map(day.child);
  const names = familyName(w, fam);
  openChat(fam[f.parent], kids, `${names}'s ${f.parent}`);
  await ask(`Hi Isabelle! I'm here for ${names}.`, ['Hello! 👋']);
  for (const c of kids) {
    const k = day.kid(c.id);
    // The parent remembers this morning's tip and checks on it.
    const yes = (await ask(checkTip(c), ['Yes! 👍', 'Not today'])) === 0;
    await ask(tipAnswer(c, yes, k.did.includes(favourite(c.pers, c.age))), ['😊']);
    const did = [...new Set(k.did)].slice(-4) as Act[];
    const i = await ask(`What else did ${c.name} do today?`, did.length ? did.map(didLabel) : ['😌 A quiet day']);
    await ask(`${did.length ? `${reaction(Math.random, did[i])} ` : ''}${heartsLine(c, k.hearts)}`, ['😊']);
  }
  await ask(homeTalk(Math.random), ['Bye bye! 👋']);
  closeModal();
  const done = day.pickUp(famId);
  if (sel !== null && !day.kid(sel).here) sel = null;
  say('emily', `Bye bye, ${names}! See you tomorrow!`);
  wishesDone(done);
  busy = false;
  persist();
  render();
  checkEnd();
}

// ---------- wardrobe ----------

type Tab = 'hair' | Slot;

function openWardrobe(start?: number) {
  busy = true;
  let who: number | 'me' = start ?? 'me';
  let tab: Tab = 'hair';
  const lookOf = (): Look => (who === 'me' ? w.isabelle : w.children.find((c) => c.id === who)!);
  const ageOf = () => (who === 'me' ? ('adult' as const) : (lookOf() as Child).age);

  const draw = () => {
    const look = lookOf();
    const age = ageOf();
    const kind = kindOf(age);
    if (tab !== 'hair' && !SLOTS[kind].includes(tab)) tab = 'hair';
    const child = who === 'me' ? null : (look as Child);
    const mini = (l: Look) => doll(l, age, 'happy', kind === 'baby' ? 100 : kind === 'adult' ? 135 : 125);
    let tiles = '';
    if (tab === 'hair') {
      tiles = HAIR[kind].map((h) => `<button class="item ${look.hair === h ? 'on' : ''}" data-hair="${h}" aria-label="${h} hair">${mini({ ...look, hair: h })}<span>${h}</span></button>`).join('');
    } else {
      const slot = tab;
      const none = NEEDED.includes(slot) ? '' : `<button class="item ${!look.outfit[slot] ? 'on' : ''}" data-item="" aria-label="None">${mini({ ...look, outfit: { ...look.outfit, [slot]: undefined } })}<span>None</span></button>`;
      tiles = none + itemsFor(kind, slot).map((it) => w.unlocked.includes(it.id)
        ? `<button class="item ${look.outfit[slot] === it.id ? 'on' : ''}" data-item="${it.id}" aria-label="${esc(it.name)}">${mini({ ...look, outfit: { ...look.outfit, [slot]: it.id } })}<span>${esc(it.name)}</span></button>`
        : `<button class="item locked" data-locked="1" aria-label="Locked">🔒<span>Coming soon</span></button>`).join('');
    }
    modal.hidden = false;
    modal.innerHTML = `<div class="wardrobe">
      <div class="who-list">
        <button class="who ${who === 'me' ? 'on' : ''}" data-who="me"><span class="head">${doll(w.isabelle, 'adult', 'happy', 120)}</span>Isabelle</button>
        ${w.children.map((c) => `<button class="who ${who === c.id ? 'on' : ''}" data-who="${c.id}"><span class="head">${doll(c, c.age, 'happy', c.age === 0 ? 70 : 100)}</span>${esc(c.name)}</button>`).join('')}
      </div>
      <div class="preview">
        <div class="big">${doll(look, age, 'happy', kind === 'baby' ? 260 : 380)}</div>
        ${child ? `<input class="name" maxlength="12" value="${esc(child.name)}" aria-label="Name"><small>${child.age === 0 ? 'Newborn' : `Age ${child.age}`} · ${PERSONALITIES[child.pers].e} ${PERSONALITIES[child.pers].label}</small>` : '<b class="name-fixed">Isabelle</b>'}
      </div>
      <div class="shop">
        <div class="tabs"><button class="tab ${tab === 'hair' ? 'on' : ''}" data-tab="hair">Hair</button>${SLOTS[kind].map((s) => `<button class="tab ${s === tab ? 'on' : ''}" data-tab="${s}">${SLOT_LABEL[s]}</button>`).join('')}</div>
        ${tab === 'hair' ? `<div class="colours">${Object.entries(HAIR_COLOURS).map(([n, c]) => `<button class="sw ${look.hairColor === n ? 'on' : ''}" data-colour="${n}" style="background:${c}" aria-label="${n} hair colour"></button>`).join('')}</div>` : ''}
        <div class="items">${tiles}</div>
        <button class="done">Done ✓</button>
      </div></div>`;
    modal.querySelector<HTMLElement>('.who.on')?.scrollIntoView({ block: 'nearest' });
    modal.querySelectorAll<HTMLElement>('.who').forEach((b) => b.addEventListener('click', () => { sfx.pop(); who = b.dataset.who === 'me' ? 'me' : Number(b.dataset.who); draw(); }));
    modal.querySelectorAll<HTMLElement>('.tab').forEach((b) => b.addEventListener('click', () => { sfx.pop(); tab = b.dataset.tab as Tab; draw(); }));
    modal.querySelectorAll<HTMLElement>('[data-colour]').forEach((b) => b.addEventListener('click', () => { sfx.sparkle(); lookOf().hairColor = b.dataset.colour!; persist(); draw(); }));
    modal.querySelectorAll<HTMLElement>('.item').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.locked) { sfx.nope(); return; }
      sfx.sparkle();
      if (b.dataset.hair) lookOf().hair = b.dataset.hair;
      else if (b.dataset.item) lookOf().outfit[tab as Slot] = b.dataset.item;
      else delete lookOf().outfit[tab as Slot];
      persist();
      draw();
    }));
    const input = modal.querySelector<HTMLInputElement>('.name');
    input?.addEventListener('change', () => {
      const n = input.value.trim().slice(0, 12);
      if (n && child) { child.name = n; persist(); }
      draw();
    });
    modal.querySelector('.done')!.addEventListener('click', () => {
      if (input && input.value.trim() && child) child.name = input.value.trim().slice(0, 12);
      sfx.pop();
      closeModal();
      persist();
      busy = false;
      render();
    });
  };
  draw();
}

// ---------- Isabelle's own child ----------

app.querySelector('.baby')!.addEventListener('click', () => { if (!busy) { sfx.pop(); babyMaker(); } });

function babyMaker() {
  busy = true;
  const draft: NewChild = { ...randomLook(Math.random, 'baby', w.unlocked, w.isabelle.skin), hairColor: w.isabelle.hairColor, name: '', age: 0, pers: 'creative' };
  const kind = (): Kind => kindOf(draft.age);
  const draw = () => {
    modal.hidden = false;
    modal.innerHTML = `<div class="maker">
      <div class="preview"><div class="big">${doll(draft, draft.age, 'happy', draft.age === 0 ? 230 : 330)}</div></div>
      <div class="opts">
        <h2>Your own child 💖</h2>
        <input class="name" maxlength="12" placeholder="Name" value="${esc(draft.name)}" aria-label="Name">
        <div class="row"><span>Age</span>${[0, 1, 2, 3, 4].map((a) => `<button class="pill ${draft.age === a ? 'on' : ''}" data-k="age" data-v="${a}">${a === 0 ? 'Newborn' : a}</button>`).join('')}</div>
        <div class="row"><span>Skin</span>${SKIN_TONES.map((c, i) => `<button class="sw ${draft.skin === i ? 'on' : ''}" data-k="skin" data-v="${i}" style="background:${c}" aria-label="skin ${i + 1}"></button>`).join('')}</div>
        <div class="row"><span>Hair</span>${Object.entries(HAIR_COLOURS).map(([n, c]) => `<button class="sw ${draft.hairColor === n ? 'on' : ''}" data-k="hairColor" data-v="${n}" style="background:${c}" aria-label="${n} hair"></button>`).join('')}</div>
        <div class="row"><span>Style</span>${HAIR[kind()].map((h) => `<button class="pill ${draft.hair === h ? 'on' : ''}" data-k="hair" data-v="${h}">${h}</button>`).join('')}</div>
        <div class="row"><span>Likes</span>${(Object.keys(PERSONALITIES) as Personality[]).map((p) => `<button class="pill ${draft.pers === p ? 'on' : ''}" data-k="pers" data-v="${p}">${PERSONALITIES[p].e} ${PERSONALITIES[p].label}</button>`).join('')}</div>
        <p class="note">Your child comes to the nursery with you and grows up a year every day. At ${GROWN_UP}, they become a helper!</p>
        <div class="btns"><button class="cancel">Not now</button><button class="ok">Done 💖</button></div>
      </div></div>`;
    const input = modal.querySelector<HTMLInputElement>('.name')!;
    input.addEventListener('input', () => { draft.name = input.value; input.classList.remove('bad'); });
    modal.querySelectorAll<HTMLElement>('[data-k]').forEach((b) => b.addEventListener('click', () => {
      sfx.pop();
      const { k, v } = b.dataset as { k: string; v: string };
      if (k === 'age') {
        const before = kind();
        draft.age = Number(v);
        Object.assign(draft, regrow(draft, before, kind(), w.unlocked, Math.random));
      } else if (k === 'skin') draft.skin = Number(v);
      else if (k === 'pers') draft.pers = v as Personality;
      else (draft as unknown as Record<string, string>)[k] = v;
      draw();
    }));
    modal.querySelector('.cancel')!.addEventListener('click', () => { sfx.pop(); closeModal(); busy = false; });
    modal.querySelector('.ok')!.addEventListener('click', () => {
      const name = draft.name.trim().slice(0, 12);
      if (!name) { sfx.nope(); input.classList.add('bad'); input.focus(); return; }
      const c = haveChild(w, { ...draft, name });
      day.addOwn(c);
      const k = day.kid(c.id);
      view = k.floor;
      homeSpot(k);
      closeModal();
      busy = false;
      sfx.cheer();
      say('isabelle', `Welcome to the nursery, ${name}! 💖`);
      persist();
      render();
    });
  };
  draw();
}

// ---------- end of the day ----------

function checkEnd() {
  if (day.done()) setTimeout(endOfDay, 700);
}

function endOfDay() {
  if (!modal.hidden) return;
  busy = true;
  sfx.cheer();
  const came = day.s.kids.filter((k) => k.here || day.s.fams.find((f) => f.id === day.child(k.id).fam)?.state === 'gone');
  const rewards = earnsReward(w, came.filter((k) => day.child(k.id).fam !== OWN).map((k) => k.hearts)) ? rewardChoices(w) : [];
  const wishes = day.s.wishes.filter((wi) => wi.got >= wi.target).length;
  modal.hidden = false;
  modal.innerHTML = `<div class="night">
    <h2>Day ${w.day} done! 🌙</h2>
    <p class="wishline">${'⭐'.repeat(wishes)}${'☆'.repeat(3 - wishes)} ${wishes} of 3 wishes came true</p>
    <div class="kids">${came.map((k) => { const c = day.child(k.id); return `<div class="kc"><div class="mini">${doll(c, c.age, 'asleep', c.age === 0 ? 60 : 80)}</div><b>${esc(c.name)}</b><div class="hearts">${hearts(k.hearts)}</div></div>`; }).join('')}</div>
    ${rewards.length ? `<h3>What a great day! Pick a reward:</h3><div class="rewards">${rewards.map((r, i) => `<button class="reward" data-i="${i}">${rewardCard(r)}</button>`).join('')}</div>` : ''}
    <button class="next" ${rewards.length ? 'hidden' : ''}>Next day ☀️</button></div>`;
  modal.querySelectorAll<HTMLElement>('.reward').forEach((b) => b.addEventListener('click', () => {
    takeReward(w, rewards[Number(b.dataset.i)]);
    sfx.sparkle();
    modal.querySelectorAll('.reward').forEach((x) => x.classList.toggle('picked', x === b));
    modal.querySelectorAll<HTMLButtonElement>('.reward').forEach((x) => { x.disabled = true; });
    modal.querySelector<HTMLElement>('.next')!.hidden = false;
    persist();
  }));
  modal.querySelector('.next')!.addEventListener('click', () => {
    const news = nextDay(w);
    closeModal();
    busy = false;
    startDay();
    const b = news.birthday;
    const lines = [
      b ? (b.age >= GROWN_UP ? `${b.name} is ${b.age} and all grown up! ${b.name} is a helper now! 🎉` : `Happy birthday, ${b.name}! ${b.name} is ${b.age} today! 🎂`) : '',
      news.family ? 'A new family is coming today!' : '',
      news.clothes.length ? `New in the wardrobe: ${news.clothes.map((i) => i.name).join(', ')}!` : '',
    ].filter(Boolean);
    say('emily', `Good morning, Isabelle! ${lines.join(' ')}`);
  });
}

function rewardCard(r: Reward): string {
  if (r.kind === 'helper') { const h = HELPERS[r.id as HelperId]; return `<span class="pic">${sprite(`helpers/${r.id}`, SIZES.helpers[r.id], 120)}</span><b>${h.name}</b><small>${h.job}</small>`; }
  if (r.kind === 'furniture') { const f = FURNITURE[r.id]; return `<span class="pic"><img src="art/rewards/${r.id}.webp" alt=""></span><b>${f.name}</b><small>New toy for ${f.floor === 'up' ? 'upstairs' : 'downstairs'}</small>`; }
  return `<span class="e">👗</span><b>New clothes</b><small>${r.ids.map((id) => ITEM[id].name).join(', ')}</small>`;
}

// ---------- start ----------

function startDay() {
  day = new Day(w, newDay(w));
  view = 'down';
  sel = null;
  peopleEl.innerHTML = '';
  lastPos.clear();
  drawZones();
  handleEvents(day.start());
  persist();
  render();
}

function begin(saved: ReturnType<typeof load>) {
  startMusic();
  started = true;
  if (saved) {
    w = saved.world;
    matchFamilies(w);
    setMuted(w.muted);
    if (saved.today && saved.today.day === w.day) {
      day = new Day(w, saved.today);
      drawZones();
      render();
      say('emily', 'Welcome back, Isabelle!');
      checkEnd();
    } else startDay();
  } else {
    w = newWorld();
    startDay();
    say('emily', "Hi Isabelle! I'm Emily. Parents are at the desk. Tap them to say hello!");
  }
  app.querySelector('.mute')!.textContent = w.muted ? '🔇' : '🔊';
}

function startScreen() {
  const saved = load(store);
  const isabelle = saved?.world.isabelle ?? newWorld().isabelle;
  modal.hidden = false;
  modal.innerHTML = `<div class="start">
    <h1>Narwhal <span>Nursery</span></h1>
    <div class="cast"><div>${doll(isabelle, 'adult', 'happy', 300)}<b>Isabelle</b></div><div>${sprite('staff/emily', SIZES.staff.emily, 300)}<b>Emily</b></div></div>
    <button class="play">▶ Play${saved ? `<small>Day ${saved.world.day}</small>` : ''}</button>
    ${saved ? '<button class="again">Start again</button>' : ''}</div>`;
  modal.querySelector('.play')!.addEventListener('click', () => { setMuted(saved?.world.muted ?? false); closeModal(); begin(saved); sfx.pop(); });
  modal.querySelector('.again')?.addEventListener('click', () => {
    sfx.pop();
    modal.innerHTML = `<div class="confirm"><h2>Are you sure?</h2><p>Your whole nursery will be wiped and you start again on day 1.</p>
      <button class="yes">Yes, start again</button><button class="no">No, keep it</button></div>`;
    modal.querySelector('.yes')!.addEventListener('click', () => { wipe(store); closeModal(); begin(null); sfx.pop(); });
    modal.querySelector('.no')!.addEventListener('click', () => { sfx.pop(); startScreen(); });
  });
}

// The room is drawn in painting pixels and scaled to the stage width.
room.style.width = `${ROOM_W}px`;
room.style.height = `${ROOM_H}px`;
startScreen();
