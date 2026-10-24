// Screens: start, the nursery (two floors), chats at the desk, the wardrobe, and the end of the day.
import './style.css';
import { ACTS, Act, CATS, CAT_LABEL, Cat, FURNITURE, Floor, HAIR_COLOURS, HELPERS, HelperId, ITEM, ITEMS, KID_HAIR, PERSONALITIES, Personality, SKINS } from './game/catalog';
import { CLOSE, Day, DayKid, Event, MAX_HEARTS, clock, newDay } from './game/day';
import { load, save, wipe } from './game/save';
import { didLabel, heartsLine, hello, reaction, tip, tipMore } from './game/talk';
import { Child, Family, GROWN_UP, Look, NewChild, OWN, Reward, World, earnsReward, familyName, haveChild, newWorld, nextDay, ownChild, ownIsHelper, randomOutfit, rewardChoices, showsDummy, takeReward } from './game/world';
import { person, personWidth } from './ui/people';
import { PLAY_AREA, ROOM_H, ROOM_W, STATIONS, Station, furnitureStations, narwhal, wallDecor } from './ui/room';
import { actSound, setMuted, sfx, startMusic } from './ui/sound';

const store = (() => { try { return window.localStorage; } catch { return null; } })();
const app = document.getElementById('app')!;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

let w: World;
let day: Day;
let view: Floor = 'down';
let sel: number | null = null;
let busy = false;
const me: Record<Floor, { x: number; y: number }> = { down: { x: 420, y: 560 }, up: { x: 620, y: 600 } };

const EMILY: Look = { skin: '#f6cfa9', hair: 'ponytail', hairColor: '#e8c170', outfit: { hat: 'hat0', headband: 'headband0', dummy: 'dummy0', top: 'top3', bottoms: 'bottoms4', shoes: 'shoes0' } };
const HELPER_TOP: Record<HelperId, string> = { nappy: 'top1', snack: 'top11', nap: 'top10', play: 'top3', art: 'top0', story: 'top2' };
const HELPER_SPOTS: Record<Floor, [number, number][]> = { down: [[285, 476], [800, 572], [430, 572], [660, 560]], up: [[600, 655], [470, 655], [180, 655], [760, 660]] };

function persist() { save(store, { world: w, today: day?.s ?? null }); }
const famOf = (id: number): Family => w.families.find((f) => f.id === id)!;
const stations = (): Station[] => [...STATIONS, ...furnitureStations(w.furniture)];

// ---------- layout ----------

app.innerHTML = `<div id="stage">
  <aside class="side">
    <div class="dayno"></div>
    <div class="clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#ffb3c8" stroke-width="6"/>
      ${Array.from({ length: 12 }, (_, i) => `<circle cx="${50 + 36 * Math.sin((i * Math.PI) / 6)}" cy="${50 - 36 * Math.cos((i * Math.PI) / 6)}" r="${i % 3 ? 2 : 3.5}" fill="#c7bcef"/>`).join('')}
      <line class="hh" x1="50" y1="50" x2="50" y2="28" stroke="#3d3a5c" stroke-width="5" stroke-linecap="round"/>
      <line class="mh" x1="50" y1="50" x2="50" y2="17" stroke="#ff7fa0" stroke-width="3.5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#3d3a5c"/></svg></div>
    <div class="time"></div>
    <button class="skip">⏩ Later</button>
    <div class="desk-note"></div>
    <div class="card"></div>
    <div class="side-btns"><button class="baby">👶 Have a child</button><button class="mute icon" aria-label="Sound off">🔊</button></div>
  </aside>
  <main class="room">
    ${(['down', 'up'] as Floor[]).map((f) => `<div class="floor ${f}" data-floor="${f}"><div class="wall"></div><div class="ground"></div>${wallDecor(f)}<div class="stations"></div></div>`).join('')}
    <div class="people"></div><div class="fx"></div>
  </main>
  <div class="say"><div class="face"></div><p></p></div>
  <div class="modal" hidden></div>
</div>`;

const stage = app.querySelector<HTMLElement>('#stage')!;
const room = app.querySelector<HTMLElement>('.room')!;
const peopleEl = app.querySelector<HTMLElement>('.people')!;
const fxEl = app.querySelector<HTMLElement>('.fx')!;
const modal = app.querySelector<HTMLElement>('.modal')!;

function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

function drawStations() {
  for (const f of ['down', 'up'] as Floor[]) {
    room.querySelector(`.floor.${f} .stations`)!.innerHTML = stations().filter((s) => s.floor === f).map((s) =>
      `<button class="st ${s.kind ?? ''}" data-st="${s.id}" ${s.act ? `data-act="${s.act}"` : ''} style="left:${s.x - s.w / 2}px;top:${s.y - s.h}px;width:${s.w}px;height:${s.h}px;z-index:${s.y}">
        ${s.art}<span class="label">${s.label}</span><span class="badge" hidden></span></button>`).join('');
  }
  // Emily stands with the furniture so the desk stays in front of her; everyone else is drawn above it all.
  const wd = personWidth('adult');
  room.querySelector('.floor.down .stations')!.insertAdjacentHTML('beforeend', `<div class="p emily" style="width:${wd}px;transform:translate(${195 - wd / 2}px, ${470 - wd * 1.56}px);z-index:470">
    <div class="art">${person({ ...EMILY, age: 'adult', badge: 'Emily' })}</div><div class="tag">Emily</div></div>`);
}

room.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const p = t.closest<HTMLElement>('.p');
  if (p) {
    if (p.dataset.kid) return tapKid(Number(p.dataset.kid));
    if (p.dataset.fam || p.classList.contains('emily')) return tapDesk(!!p.dataset.fam);
    return;
  }
  const st = t.closest<HTMLElement>('.st');
  if (st) tapStation(stations().find((s) => s.id === st.dataset.st)!);
});

// ---------- talking ----------

function say(who: 'isabelle' | 'emily', text: string) {
  const bar = app.querySelector('.say')!;
  bar.querySelector('.face')!.innerHTML = person(who === 'emily' ? { ...EMILY, age: 'adult' } : { ...w.isabelle, age: 'adult' });
  bar.querySelector('.face')!.setAttribute('data-who', who);
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

function el(key: string, html: () => string, cls: string): HTMLElement {
  let e = peopleEl.querySelector<HTMLElement>(`[data-key="${key}"]`);
  if (!e) {
    e = document.createElement('div');
    e.dataset.key = key;
    peopleEl.appendChild(e);
    e.innerHTML = `<div class="art"></div><div class="bubble" hidden></div><div class="tag"></div>`;
  }
  e.className = `p ${cls}`;
  const art = html();
  if (e.dataset.art !== art) { e.querySelector('.art')!.innerHTML = art; e.dataset.art = art; }
  return e;
}

function place(e: HTMLElement, x: number, y: number, age: number | 'adult', floor: Floor, lift = 0) {
  const wd = personWidth(age);
  e.style.width = `${wd}px`;
  e.style.transform = `translate(${x - wd / 2}px, ${y - wd * 1.56}px)`;
  e.style.zIndex = String(Math.round(y) + 1 + lift);
  e.classList.toggle('away', floor !== view);
}

function homeSpot(k: DayKid) {
  const a = PLAY_AREA[k.floor];
  k.x = rand(a.x[0], a.x[1]);
  k.y = rand(a.y[0], a.y[1]);
  k.at = '';
}

function render() {
  const s = day.s;
  app.querySelector('.dayno')!.textContent = `Day ${w.day}`;
  app.querySelector('.time')!.textContent = clock(s.t);
  const h = s.t / 60;
  app.querySelector('.hh')!.setAttribute('transform', `rotate(${(h % 12) * 30} 50 50)`);
  app.querySelector('.mh')!.setAttribute('transform', `rotate(${(s.t % 60) * 6} 50 50)`);
  app.querySelector('.skip')!.classList.toggle('off', !day.canSkip());
  const waiting = s.queue.length;
  app.querySelector('.desk-note')!.innerHTML = waiting ? `🔔 ${waiting} at the desk` : `👶 ${day.present().length} here`;
  room.querySelectorAll<HTMLElement>('.floor').forEach((f) => f.classList.toggle('show', f.dataset.floor === view));

  const seen = new Set<string>();
  const mark = (e: HTMLElement) => { seen.add(e.dataset.key!); return e; };


  // Isabelle.
  const isa = mark(el('isabelle', () => person({ ...w.isabelle, age: 'adult' }), 'isabelle'));
  place(isa, me[view].x, me[view].y, 'adult', view);
  isa.querySelector('.tag')!.textContent = 'Isabelle';

  // The line at the desk, front first.
  s.queue.forEach((famId, i) => {
    const f = day.fam(famId);
    const look = famOf(famId)[f.parent];
    const e = mark(el(`fam${famId}`, () => person({ ...look, age: 'adult' }), `parent ${i === 0 ? 'front' : ''}`));
    e.dataset.fam = String(famId);
    if (!e.dataset.placed) { place(e, 55, 430, 'adult', 'down'); e.dataset.placed = '1'; void e.offsetWidth; }
    const [x, y] = ([[322, 640], [252, 676], [180, 690], [110, 690]] as const)[i] ?? [110, 690];
    place(e, x, y, 'adult', 'down', i === 0 ? 2000 : 0);
    e.classList.toggle('more', i >= 4);
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
    const e = mark(el(`helper-${hId}`, () => person({ ...EMILY, hair: 'short', hairColor: '#6b4226', outfit: { ...EMILY.outfit, top: HELPER_TOP[hId] }, age: 'adult' }), 'helper'));
    place(e, x, y, 'adult', hp.floor);
    e.querySelector('.tag')!.textContent = `${hp.e} ${hp.name}`;
  }

  const own = ownChild(w);
  if (own && ownIsHelper(w)) {
    const [x, y] = HELPER_SPOTS.down[used.down];
    const e = mark(el('own-helper', () => person({ ...own, age: 'adult' }), 'helper'));
    place(e, x, y, 'adult', 'down');
    e.querySelector('.tag')!.textContent = `💖 ${own.name} (helper)`;
  }
  app.querySelector<HTMLElement>('.baby')!.hidden = !!own;

  // Children.
  for (const k of s.kids) {
    if (!k.here) continue;
    const c = day.child(k.id);
    if (k.at.startsWith('cot') && !day.asleep(k)) homeSpot(k);
    if (!k.x) homeSpot(k);
    const lying = day.asleep(k) && k.at.startsWith('cot');
    const e = mark(el(`kid${k.id}`, () => person({ ...c, age: c.age, sleeping: day.asleep(k) }), `kid ${sel === k.id ? 'sel' : ''} ${lying ? 'lying' : ''}`));
    e.dataset.kid = String(k.id);
    // A child who needs something comes to the front so they can always be tapped.
    place(e, k.x, k.y, c.age, k.floor, k.need && !day.asleep(k) ? 1000 : 0);
    e.querySelector('.tag')!.textContent = `${c.fam === OWN ? '💖' : ''}${PERSONALITIES[c.pers].e} ${c.name}`;
    const b = e.querySelector<HTMLElement>('.bubble')!;
    const asleep = day.asleep(k);
    b.hidden = !k.need && !asleep;
    b.textContent = asleep ? '💤' : k.need ? ACTS[k.need.act].e : '';
    b.dataset.need = asleep ? '' : (k.need?.act ?? '');
    b.classList.toggle('late', !!k.need && !asleep && s.t - k.need.since >= 30);
  }

  peopleEl.querySelectorAll<HTMLElement>('.p').forEach((e) => { if (!seen.has(e.dataset.key!)) e.remove(); });

  // Stairs show what's waiting on the other floor.
  for (const st of ['stairsUp', 'stairsDown']) {
    const other: Floor = st === 'stairsUp' ? 'up' : 'down';
    const needs = day.present().filter((k) => k.floor === other && k.need && !day.asleep(k)).length;
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
  if (sel === null) { card.innerHTML = `<p class="hint">Tap a child, then tap what they need.</p>`; return; }
  const k = day.kid(sel);
  const c = day.child(sel);
  const want = day.asleep(k) ? '💤 Asleep' : k.need ? `${ACTS[k.need.act].e} Wants ${ACTS[k.need.act].want}` : '😊 Happy';
  card.innerHTML = `<div class="mini">${person({ ...c, age: c.age })}</div><b>${esc(c.name)}</b>
    <small>${c.fam === OWN ? '💖 My child · ' : ''}${c.age === 0 ? 'Newborn' : `Age ${c.age}`} · ${PERSONALITIES[c.pers].e} ${PERSONALITIES[c.pers].label}</small>
    <div class="hearts">${hearts(k.hearts)}</div><small class="want">${want}</small>`;
}

// ---------- taps in the room ----------

function tapKid(id: number) {
  if (busy) return;
  sfx.pop();
  sel = sel === id ? null : id;
  if (sel !== null) {
    const k = day.kid(id);
    const c = day.child(id);
    if (day.asleep(k)) say('isabelle', `Shh! ${c.name} is asleep.`);
    else if (k.need) say('isabelle', `${c.name} wants ${ACTS[k.need.act].want}! Tap the ${ACTS[k.need.act].place}${ACTS[k.need.act].floor !== view ? ` ${ACTS[k.need.act].floor === 'up' ? 'upstairs' : 'downstairs'}` : ''}.`);
    else say('isabelle', `${c.name} is happy! Let's do something fun.`);
  }
  render();
}

function tapStation(st: Station) {
  if (busy) return;
  if (st.kind === 'stairs') return switchFloor();
  if (st.kind === 'wardrobe') { sfx.pop(); return openWardrobe(sel ?? undefined); }
  if (st.kind === 'desk') return tapDesk(true);
  if (sel === null) { sfx.nope(); say('isabelle', 'Tap a child first!'); return; }
  void doAct(sel, st);
}

function switchFloor() {
  sfx.pop();
  view = view === 'down' ? 'up' : 'down';
  const stairs = STATIONS.find((s) => s.kind === 'stairs' && s.floor === view)!;
  me[view] = { x: stairs.kx - 70, y: stairs.ky };
  if (sel !== null) {
    const k = day.kid(sel);
    k.floor = view;
    k.at = '';
    k.x = stairs.kx - 120;
    k.y = stairs.ky + 10;
    say('isabelle', `Come on, ${day.child(sel).name}! ${view === 'up' ? 'Up' : 'Down'} we go!`);
  }
  persist();
  render();
}

/** Children at the same thing stand side by side, never on top of each other. */
function moveKidTo(k: DayKid, st: Station) {
  const n = day.present().filter((o) => o !== k && o.at === st.id).length;
  const step = st.act === 'nap' ? 22 : 46;
  k.floor = st.floor;
  k.at = st.id;
  k.x = st.kx + (n % 2 ? -1 : 1) * Math.ceil(n / 2) * step;
  k.y = st.ky + (n % 3) * 4;
}

async function doAct(id: number, st: Station) {
  const c = day.child(id);
  const r = day.act(id, st.act!, st.minAge ?? 0);
  if (!r.ok) {
    sfx.nope();
    say('isabelle', r.why === 'asleep' ? `Shh! ${c.name} is asleep.` : r.why === 'tooLittle' ? `${c.name} is too little for that!` : `${c.name} is too big for that!`);
    return;
  }
  busy = true;
  const k = day.kid(id);
  moveKidTo(k, st);
  me[view] = { x: st.kx + 70, y: Math.max(st.ky + 30, 470) };
  sel = null;
  render();
  actSound(st.act!);
  fx(ACTS[st.act!].e, k.x, k.y - 120);
  if (r.matched || r.fav) setTimeout(() => fx(r.fav ? '💖💖' : '💖', k.x, k.y - 90, 'heart'), 250);
  say('isabelle', r.fav ? `${c.name} loved that! It's the favourite!` : r.matched ? `Yay! ${c.name} is happy.` : `${c.name} had fun!`);
  await sleep(650);
  busy = false;
  handleEvents(r.events);
  persist();
  render();
  checkEnd();
}

function handleEvents(events: Event[]) {
  for (const ev of events) {
    if (ev.type === 'helper') {
      const k = day.kid(ev.kid);
      const options = stations().filter((s) => s.act === ev.act);
      moveKidTo(k, options[Math.floor(Math.random() * options.length)]);
      if (k.floor === view) setTimeout(() => fx(ACTS[ev.act].e, k.x, k.y - 110), 300);
    } else {
      sfx.ding();
      const f = day.fam(ev.fam);
      const who = `${familyName(w, famOf(ev.fam))}'s ${f.parent}`;
      say('emily', ev.type === 'arrive' ? `Ding dong! ${who} is at the desk.` : `${who} is here for pick-up!`);
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

// ---------- chats ----------

function openChat(look: Look, kids: Child[], who: string) {
  modal.hidden = false;
  modal.innerHTML = `<div class="chat">
    <div class="scene">
      <div class="side-a"><div class="big">${person({ ...look, age: 'adult' })}</div>${kids.map((c) => `<div class="small">${person({ ...c, age: c.age })}<span>${esc(c.name)}</span></div>`).join('')}</div>
      <div class="speech"><b>${esc(who)}</b><p></p></div>
      <div class="side-b"><div class="big">${person({ ...w.isabelle, age: 'adult' })}</div></div>
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
    const did = [...new Set(k.did)].slice(-4) as Act[];
    const i = await ask(`What did ${c.name} do today?`, did.length ? did.map(didLabel) : ['😌 A quiet day']);
    await ask(`${did.length ? `${reaction(Math.random, did[i])} ` : ''}${heartsLine(c, k.hearts)}`, ['😊']);
  }
  await ask('See you tomorrow!', ['Bye bye! 👋']);
  closeModal();
  day.pickUp(famId);
  if (sel !== null && !day.kid(sel).here) sel = null;
  say('emily', `Bye bye, ${names}!`);
  busy = false;
  persist();
  render();
  checkEnd();
}

// ---------- wardrobe ----------

function openWardrobe(start?: number) {
  busy = true;
  let who: number | 'me' = start ?? 'me';
  let cat: Cat = 'hat';
  const lookOf = () => (who === 'me' ? w.isabelle : w.children.find((c) => c.id === who)!);
  const ageOf = () => (who === 'me' ? ('adult' as const) : (lookOf() as Child).age);
  const cats = () => CATS.filter((c) => c !== 'dummy' || showsDummy(ageOf()));

  const draw = () => {
    if (!cats().includes(cat)) cat = 'hat';
    const look = lookOf();
    const age = ageOf();
    const child = who === 'me' ? null : (look as Child);
    modal.hidden = false;
    modal.innerHTML = `<div class="wardrobe">
      <div class="who-list">
        <button class="who ${who === 'me' ? 'on' : ''}" data-who="me"><span class="head">${person({ ...w.isabelle, age: 'adult' })}</span>Isabelle</button>
        ${w.children.map((c) => `<button class="who ${who === c.id ? 'on' : ''}" data-who="${c.id}"><span class="head">${person({ ...c, age: c.age })}</span>${esc(c.name)}</button>`).join('')}
      </div>
      <div class="preview">
        <div class="big">${person({ ...look, age })}</div>
        ${child ? `<input class="name" maxlength="12" value="${esc(child.name)}" aria-label="Name"><small>${child.age === 0 ? 'Newborn' : `Age ${child.age}`} · ${PERSONALITIES[child.pers].e} ${PERSONALITIES[child.pers].label}</small>` : '<b class="name-fixed">Isabelle</b>'}
      </div>
      <div class="shop">
        <div class="tabs">${cats().map((c) => `<button class="tab ${c === cat ? 'on' : ''}" data-cat="${c}">${CAT_LABEL[c]}</button>`).join('')}</div>
        <div class="items">${ITEMS[cat].map((it) => w.unlocked.includes(it.id)
          ? `<button class="item ${look.outfit[cat] === it.id ? 'on' : ''} ${['hat', 'headband', 'dummy'].includes(cat) ? 'head-up' : ''}" data-item="${it.id}" aria-label="${esc(it.name)}"><div class="pv">${person({ ...look, age, outfit: { ...look.outfit, [cat]: it.id } })}</div><span>${esc(it.name)}</span></button>`
          : `<button class="item locked" data-locked="1" aria-label="Locked">🔒<span>Coming soon</span></button>`).join('')}</div>
        <button class="done">Done ✓</button>
      </div></div>`;
    modal.querySelector<HTMLElement>('.who.on')?.scrollIntoView({ block: 'nearest' });
    modal.querySelectorAll<HTMLElement>('.who').forEach((b) => b.addEventListener('click', () => { sfx.pop(); who = b.dataset.who === 'me' ? 'me' : Number(b.dataset.who); draw(); }));
    modal.querySelectorAll<HTMLElement>('.tab').forEach((b) => b.addEventListener('click', () => { sfx.pop(); cat = b.dataset.cat as Cat; draw(); }));
    modal.querySelectorAll<HTMLElement>('.item').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.locked) { sfx.nope(); return; }
      sfx.sparkle();
      lookOf().outfit[cat] = b.dataset.item!;
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
  const draft: NewChild = { name: '', age: 0, pers: 'creative', skin: w.isabelle.skin, hair: 'short', hairColor: w.isabelle.hairColor, outfit: randomOutfit(Math.random, 0) };
  const hairOf = () => (draft.age === 0 ? 'tuft' : draft.hair);
  const swatch = (k: string, v: string, on: boolean) => `<button class="sw ${on ? 'on' : ''}" data-k="${k}" data-v="${v}" style="background:${v}" aria-label="${k} ${v}"></button>`;
  const draw = () => {
    modal.hidden = false;
    modal.innerHTML = `<div class="maker">
      <div class="preview"><div class="big">${person({ ...draft, hair: hairOf(), outfit: draft.outfit!, age: draft.age })}</div></div>
      <div class="opts">
        <h2>Your own child 💖</h2>
        <input class="name" maxlength="12" placeholder="Name" value="${esc(draft.name)}" aria-label="Name">
        <div class="row"><span>Age</span>${[0, 1, 2, 3, 4].map((a) => `<button class="pill ${draft.age === a ? 'on' : ''}" data-k="age" data-v="${a}">${a === 0 ? 'Newborn' : a}</button>`).join('')}</div>
        <div class="row"><span>Skin</span>${SKINS.map((c) => swatch('skin', c, draft.skin === c)).join('')}</div>
        <div class="row"><span>Hair</span>${HAIR_COLOURS.map((c) => swatch('hairColor', c, draft.hairColor === c)).join('')}</div>
        ${draft.age ? `<div class="row"><span>Style</span>${KID_HAIR.map((h) => `<button class="pill ${draft.hair === h ? 'on' : ''}" data-k="hair" data-v="${h}">${h}</button>`).join('')}</div>` : ''}
        <div class="row"><span>Likes</span>${(Object.keys(PERSONALITIES) as Personality[]).map((p) => `<button class="pill ${draft.pers === p ? 'on' : ''}" data-k="pers" data-v="${p}">${PERSONALITIES[p].e} ${PERSONALITIES[p].label}</button>`).join('')}</div>
        <p class="note">Your child comes to the nursery with you and grows up a year every day. At ${GROWN_UP}, they become a helper!</p>
        <div class="btns"><button class="cancel">Not now</button><button class="ok">Done 💖</button></div>
      </div></div>`;
    const input = modal.querySelector<HTMLInputElement>('.name')!;
    input.addEventListener('input', () => { draft.name = input.value; input.classList.remove('bad'); });
    modal.querySelectorAll<HTMLElement>('[data-k]').forEach((b) => b.addEventListener('click', () => {
      sfx.pop();
      const { k, v } = b.dataset as { k: string; v: string };
      if (k === 'age') { draft.age = Number(v); draft.outfit!.dummy = showsDummy(draft.age) ? draft.outfit!.dummy : 'dummy0'; }
      else if (k === 'pers') draft.pers = v as Personality;
      else (draft as unknown as Record<string, string>)[k] = v;
      draw();
    }));
    modal.querySelector('.cancel')!.addEventListener('click', () => { sfx.pop(); closeModal(); busy = false; });
    modal.querySelector('.ok')!.addEventListener('click', () => {
      const name = draft.name.trim().slice(0, 12);
      if (!name) { sfx.nope(); input.classList.add('bad'); input.focus(); return; }
      const c = haveChild(w, { ...draft, name, hair: hairOf() });
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
  modal.hidden = false;
  modal.innerHTML = `<div class="night">
    <h2>Day ${w.day} done! 🌙</h2>
    <div class="kids">${came.map((k) => { const c = day.child(k.id); return `<div class="kc"><div class="mini">${person({ ...c, age: c.age, sleeping: true })}</div><b>${esc(c.name)}</b><div class="hearts">${hearts(k.hearts)}</div></div>`; }).join('')}</div>
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
  if (r.kind === 'helper') { const h = HELPERS[r.id]; return `<span class="e">${h.e}</span><b>${h.name}</b><small>${h.job}</small>`; }
  if (r.kind === 'furniture') { const f = FURNITURE[r.id]; return `<span class="e">${f.e}</span><b>${f.name}</b><small>New toy for ${f.floor === 'up' ? 'upstairs' : 'downstairs'}</small>`; }
  return `<span class="e">👗</span><b>New clothes</b><small>${r.ids.map((id) => ITEM[id].name).join(', ')}</small>`;
}

// ---------- start ----------

function startDay() {
  day = new Day(w, newDay(w));
  view = 'down';
  sel = null;
  peopleEl.innerHTML = '';
  drawStations();
  handleEvents(day.start());
  persist();
  render();
}

function begin(saved: ReturnType<typeof load>) {
  startMusic();
  if (saved) {
    w = saved.world;
    setMuted(w.muted);
    if (saved.today && saved.today.day === w.day) {
      day = new Day(w, saved.today);
      drawStations();
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
  modal.hidden = false;
  modal.innerHTML = `<div class="start">
    <div class="logo">${narwhal(1.6)}</div>
    <h1>Narwhal <span>Nursery</span></h1>
    <div class="cast"><div>${person({ ...(saved?.world.isabelle ?? newWorld().isabelle), age: 'adult' })}<b>Isabelle</b></div><div>${person({ ...EMILY, age: 'adult', badge: 'Emily' })}<b>Emily</b></div></div>
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

startScreen();
