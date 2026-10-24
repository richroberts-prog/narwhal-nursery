// A person's face, drawn on a canvas that sits on the front of the head: eyes, brows, nose, mouth, cheeks.
// Every detail is a setting, so the wardrobe can change any of them.
import { Color } from 'three';

export type Face = {
  eyes: string; eyeShape: 'round' | 'almond' | 'sleepy' | 'sparkly'; eyeSize: number; eyeGap: number;
  lashes: 'none' | 'some' | 'long'; brows: 'soft' | 'arched' | 'straight' | 'thick' | 'thin'; browColour: string;
  browHeight: number; browTilt: number; nose: 'button' | 'dot' | 'none'; mouth: Mouth; freckles: boolean; blush: number;
};
export type Mouth = 'smile' | 'grin' | 'open' | 'small' | 'worried';
export type Expr = { blink: number; asleep: boolean; mouth: Mouth | null; worried: boolean; tears: boolean };

export const EYE_COLOURS: Record<string, string> = { brown: '#6b4024', hazel: '#8a6a2e', green: '#3f8a4a', blue: '#3f7fd0', lightblue: '#7cc0ec', grey: '#7d8a96', violet: '#8a5cc8' };

const shadeHex = (hex: string, k: number) => '#' + new Color(hex).multiplyScalar(k).getHexString();
const mixHex = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString();
// Fixed wobble so the iris pattern stays the same between redraws
const wob = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;

type G = CanvasRenderingContext2D;
type Eye = { rw: number; up: number; down: number };

function eyeShape(f: Face, s: number): Eye {
  const [rw, up, down] = { round: [40, 1.25, 1.2], almond: [46, 1.05, 0.72], sleepy: [42, 0.78, 0.95], sparkly: [42, 1.3, 1.2] }[f.eyeShape];
  return { rw: rw * s, up: 34 * s * up, down: 34 * s * down };
}
function eyePath(g: G, e: Eye, sx: number) {
  // the inner corner a little lower than the outer one, like real eyes
  const xi = -sx * e.rw, xo = sx * e.rw;
  g.beginPath(); g.moveTo(xi, 4);
  g.bezierCurveTo(xi + sx * e.rw * 0.35, -e.up, xo - sx * e.rw * 0.45, -e.up, xo, -3);
  g.bezierCurveTo(xo - sx * e.rw * 0.35, e.down, xi + sx * e.rw * 0.4, e.down, xi, 4);
  g.closePath();
}
/** A point along the upper lid, t from inner (0) to outer (1) corner. */
function lid(e: Eye, sx: number, t: number): [number, number] {
  const u = 1 - t, xi = -sx * e.rw, xo = sx * e.rw;
  return [u * u * u * xi + 3 * u * u * t * (xi + sx * e.rw * 0.35) + 3 * u * t * t * (xo - sx * e.rw * 0.45) + t * t * t * xo,
    u * u * u * 4 + 3 * u * u * t * -e.up + 3 * u * t * t * -e.up + t * t * t * -3];
}

function drawEye(g: G, f: Face, skin: string, sx: number, s: number, open: number) {
  const e = eyeShape(f, s);
  g.save(); g.scale(1, Math.max(0.06, open));
  eyePath(g, e, sx);
  const sg = g.createRadialGradient(0, 4, e.rw * 0.2, 0, 4, e.rw * 1.1);
  sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#eadcdc');
  g.fillStyle = sg; g.fill();
  g.save(); eyePath(g, e, sx); g.clip();
  // iris: dark rim, coloured fibres, a lighter ring round the pupil
  const ir = Math.min(e.up, e.down) * 0.55 + e.rw * 0.42, iy = 2, ic = EYE_COLOURS[f.eyes] ?? f.eyes;
  const ig = g.createRadialGradient(0, iy, ir * 0.2, 0, iy, ir);
  ig.addColorStop(0, mixHex(ic, '#ffffff', 0.35)); ig.addColorStop(0.55, ic); ig.addColorStop(0.88, shadeHex(ic, 0.7)); ig.addColorStop(1, shadeHex(ic, 0.35));
  g.fillStyle = ig; g.beginPath(); g.arc(0, iy, ir, 0, 7); g.fill();
  g.lineWidth = 1.4;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r0 = ir * 0.45, r1 = ir * (0.8 + 0.15 * Math.abs(wob(i)));
    g.strokeStyle = i % 2 ? `rgba(255,255,255,${0.12 + 0.12 * Math.abs(wob(i + 9))})` : `rgba(0,0,0,${0.1 + 0.1 * Math.abs(wob(i + 3))})`;
    g.beginPath(); g.moveTo(Math.cos(a) * r0, iy + Math.sin(a) * r0); g.lineTo(Math.cos(a + 0.05) * r1, iy + Math.sin(a + 0.05) * r1); g.stroke();
  }
  g.strokeStyle = mixHex(ic, '#fff3c8', 0.5); g.globalAlpha = 0.45; g.lineWidth = 3; g.beginPath(); g.arc(0, iy, ir * 0.52, 0, 7); g.stroke(); g.globalAlpha = 1;
  const pg = g.createRadialGradient(0, iy, 0, 0, iy, ir * 0.42);
  pg.addColorStop(0, '#050304'); pg.addColorStop(0.85, '#140c0e'); pg.addColorStop(1, 'rgba(20,12,14,0)');
  g.fillStyle = pg; g.beginPath(); g.arc(0, iy, ir * 0.44, 0, 7); g.fill();
  // shadow from the upper lid
  const lg = g.createLinearGradient(0, -e.up, 0, -e.up * 0.1);
  lg.addColorStop(0, 'rgba(70,35,35,.55)'); lg.addColorStop(1, 'rgba(70,35,35,0)');
  g.fillStyle = lg; g.fillRect(-e.rw * 1.2, -e.up * 1.2, e.rw * 2.4, e.up * 1.2);
  if (f.eyeShape === 'sleepy') { g.fillStyle = skin; g.fillRect(-e.rw * 1.2, -e.up * 1.3, e.rw * 2.4, e.up * 0.75); }
  // catch-lights
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.ellipse(ir * 0.36, iy - ir * 0.42, ir * 0.26, ir * 0.2, -0.5, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-ir * 0.34, iy + ir * 0.38, ir * 0.1, 0, 7); g.fill();
  if (f.eyeShape === 'sparkly') { g.beginPath(); g.arc(-ir * 0.1, iy - ir * 0.55, ir * 0.08, 0, 7); g.arc(ir * 0.5, iy + ir * 0.15, ir * 0.06, 0, 7); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(230,140,140,.7)'; g.beginPath(); g.ellipse(-sx * (e.rw - 5), 4, 5, 4, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(110,60,55,.4)'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-sx * e.rw * 0.85, 6); g.bezierCurveTo(-sx * e.rw * 0.3, e.down + 1, sx * e.rw * 0.4, e.down + 1, sx * e.rw, -2); g.stroke();
  // upper lid line, thicker towards the outer corner, and a crease above
  const lidY = f.eyeShape === 'sleepy' ? -e.up * 0.45 : null;
  g.strokeStyle = '#2a1715';
  for (const [w, from] of [[4, 0], [7, 0.45], [9.5, 0.75]]) {
    g.lineWidth = w; g.beginPath();
    if (lidY !== null) { g.moveTo(-sx * e.rw + 2 * sx * e.rw * from, lidY); g.lineTo(sx * e.rw, lidY - 3); }
    else for (let i = 0; i <= 20; i++) { const [x, y] = lid(e, sx, from + (1 - from) * i / 20); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(140,80,70,.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-sx * e.rw * 0.7, -e.up * 0.95 - 8); g.quadraticCurveTo(0, -e.up * 1.3 - 10, sx * e.rw * 0.95, -e.up * 0.8 - 6); g.stroke();
  if (f.lashes !== 'none') {
    const n = f.lashes === 'long' ? 5 : 3, len = f.lashes === 'long' ? 22 : 14;
    g.fillStyle = '#1e1110';
    for (let i = 0; i < n; i++) {
      const [x, y0] = lid(e, sx, 0.5 + i * (0.5 / n)), y = lidY ?? y0;
      const l = len * (0.7 + 0.3 * i / n), dx = sx * l * (0.35 + 0.5 * i / n), dy = -l;
      g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x + dx * 0.2, y + dy * 0.7, x + dx, y + dy * 0.8); g.quadraticCurveTo(x + dx * 0.2 + 2, y + dy * 0.5, x + 3, y); g.fill();
    }
  }
  g.restore();
}

function drawMouth(g: G, skin: string, mouth: Mouth, cx: number, my: number) {
  const lip = mixHex(skin, '#c94860', 0.75), lipDark = mixHex(skin, '#7a2a36', 0.75);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (mouth === 'smile' || mouth === 'small' || mouth === 'worried') {
    const w = mouth === 'small' ? 22 : 38;
    const c = mouth === 'worried' ? -9 : mouth === 'small' ? 6 : 16, cornerY = my - (mouth === 'worried' ? -4 : 6);
    // lips follow the mouth line: a thin upper lip with a cupid's bow, a fuller lower lip
    const line = (x: number) => cornerY + (my + c - cornerY) * (1 - (x / w) ** 2);
    const up = (x: number) => 8 * (1 - (x / w) ** 2) ** 0.7 + 2.5 * Math.exp(-((Math.abs(x) - w * 0.22) ** 2) / 40) - 2 * Math.exp(-(x ** 2) / 20);
    const low = (x: number) => 14 * (1 - (x / w) ** 2) ** 0.8;
    const xs = Array.from({ length: 31 }, (_, i) => -w + (2 * w * i) / 30);
    const band = (a: (x: number) => number, b: (x: number) => number) => {
      g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo(cx + x, a(x)) : g.moveTo(cx + x, a(x)))); [...xs].reverse().forEach((x) => g.lineTo(cx + x, b(x)));
    };
    g.fillStyle = mixHex(lip, skin, 0.15); band((x) => line(x) - up(x), line); g.fill();
    const lg = g.createLinearGradient(0, my + c - 4, 0, my + c + 12); lg.addColorStop(0, lip); lg.addColorStop(1, mixHex(lip, skin, 0.35));
    g.fillStyle = lg; band(line, (x) => line(x) + low(x)); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx + 3, line(0) + 6, w * 0.25, 2.5, 0, 0, 7); g.fill();
    g.strokeStyle = lipDark; g.lineWidth = 4.5; g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo(cx + x, line(x)) : g.moveTo(cx + x, line(x)))); g.stroke();
    if (mouth !== 'worried') for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * w, cornerY, 3, 0, 7); g.fillStyle = 'rgba(150,70,70,.35)'; g.fill(); }
    return;
  }
  // open mouths: grin (wide, teeth showing) and open (surprised)
  const grin = mouth === 'grin';
  const path = () => {
    g.beginPath();
    if (grin) { g.moveTo(cx - 44, my - 10); g.quadraticCurveTo(cx - 20, my - 4, cx, my - 3); g.quadraticCurveTo(cx + 20, my - 4, cx + 44, my - 10); g.bezierCurveTo(cx + 34, my + 38, cx - 34, my + 38, cx - 44, my - 10); }
    else g.ellipse(cx, my + 8, 21, 27, 0, 0, 7);
  };
  path(); g.fillStyle = '#4a1620'; g.fill();
  g.save(); path(); g.clip();
  g.fillStyle = '#e46b80'; g.beginPath(); g.ellipse(cx, my + (grin ? 30 : 34), grin ? 26 : 16, 14, 0, 0, 7); g.fill();
  const ty = grin ? my - 8 : my - 20, th = grin ? 13 : 11;
  g.fillStyle = '#fbf8f2'; g.fillRect(cx - 48, ty, 96, th);
  g.strokeStyle = 'rgba(180,160,150,.6)'; g.lineWidth = 1.5;
  for (const x of [-21, -7, 7, 21]) { g.beginPath(); g.moveTo(cx + x, ty + 2); g.lineTo(cx + x, ty + th); g.stroke(); }
  g.restore();
  g.strokeStyle = lip; g.lineWidth = 6; path(); g.stroke();
  g.strokeStyle = lipDark; g.lineWidth = 1.5; path(); g.stroke();
}

/** Draw the face. The canvas is 512 x 448; `baby` makes the eyes sit lower and bigger. */
export function drawFace(g: G, f: Face, skin: string, ex: Expr, baby: boolean, adult: boolean) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 512, 448);
  const k = 1.18;
  g.setTransform(k, 0, 0, k, 256 * (1 - k), 230 * (1 - k) + 12);
  const cx = 256, eyeY = 200 + (baby ? 10 : 0), gap = 96 * f.eyeGap * (adult ? 0.95 : 1), s = 1.22 * f.eyeSize * (baby ? 1.1 : adult ? 0.85 : 1);
  const closed = ex.blink > 0.5 || ex.asleep;
  if (f.blush > 0) for (const sx of [-1, 1]) {
    const gr = g.createRadialGradient(cx + sx * 150, eyeY + 92, 4, cx + sx * 150, eyeY + 92, 56);
    gr.addColorStop(0, `rgba(255,110,140,${0.42 * f.blush})`); gr.addColorStop(1, 'rgba(255,110,140,0)');
    g.fillStyle = gr; g.fillRect(cx + sx * 150 - 60, eyeY + 32, 120, 120);
  }
  if (f.freckles) for (const sx of [-1, 1]) for (const [dx, dy, r] of [[0, 0, 3.5], [22, 8, 3], [-18, 12, 2.5], [8, 26, 3.5], [30, 30, 2.5], [-6, 34, 3], [40, 14, 2], [-30, 28, 2]]) {
    g.fillStyle = `rgba(150,80,50,${0.3 + 0.2 * Math.abs(wob(dx + dy))})`; g.beginPath(); g.arc(cx + sx * (118 + dx), eyeY + 66 + dy, r, 0, 7); g.fill();
  }
  for (const sx of [-1, 1]) {
    g.save(); g.translate(cx + sx * gap, eyeY);
    if (closed) {
      const e = eyeShape(f, s);
      g.strokeStyle = '#2a1715'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-e.rw, -2); g.quadraticCurveTo(0, e.down * 0.7, e.rw, -4); g.stroke();
      if (f.lashes !== 'none') {
        g.lineWidth = 3.5;
        for (const t of [0.35, 0.55, 0.75, 0.92]) { const px = -e.rw + 2 * e.rw * t, py = (1 - t) * (1 - t) * -2 + 2 * t * (1 - t) * e.down * 0.7 + t * t * -4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + sx * 4, py + 9); g.stroke(); }
      }
    } else drawEye(g, f, skin, sx, s, 1 - ex.blink * 2);
    if (ex.tears && !ex.asleep) { g.fillStyle = 'rgba(120,190,255,.85)'; g.beginPath(); g.ellipse(sx * 10, 44, 7, 11, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(sx * 16, 78, 5, 8, 0, 0, 7); g.fill(); }
    g.restore();
  }
  // eyebrows: tapered, softer at the tail
  const by = eyeY - 54 * Math.max(1, s) - f.browHeight * 18 - (ex.worried ? 8 : 0);
  const bw = { soft: 9, arched: 10, straight: 10, thick: 16, thin: 5 }[f.brows];
  for (const sx of [-1, 1]) {
    const x = cx + sx * gap, tilt = f.browTilt * 14 + (ex.worried ? -14 : 0);
    const x0 = x - sx * 36, x1 = x + sx * 40, y0 = by + tilt + 4, y1 = by - tilt + 6;
    const peak = f.brows === 'arched' ? by - 18 : f.brows === 'straight' ? (y0 + y1) / 2 : by - 9;
    const pt = (t: number): [number, number] => { const u = 1 - t; return [u * u * x0 + 2 * u * t * (x + sx * 8) + t * t * x1, u * u * y0 + 2 * u * t * peak + t * t * y1]; };
    const half = (t: number) => (bw * (0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.6))) * (1 - t * 0.55)) / 2;
    g.beginPath();
    for (let i = 0; i <= 24; i++) { const [px, py] = pt(i / 24); if (i) g.lineTo(px, py - half(i / 24)); else g.moveTo(px, py - half(i / 24)); }
    for (let i = 24; i >= 0; i--) { const [px, py] = pt(i / 24); g.lineTo(px, py + half(i / 24)); }
    g.save(); g.fillStyle = f.browColour; g.shadowColor = f.browColour; g.shadowBlur = 3; g.globalAlpha = 0.9; g.fill(); g.restore();
  }
  const ny = eyeY + 72;
  if (f.nose === 'button') {
    const ng = g.createRadialGradient(cx, ny + 6, 2, cx, ny + 6, 26); ng.addColorStop(0, 'rgba(150,80,60,.28)'); ng.addColorStop(1, 'rgba(150,80,60,0)');
    g.fillStyle = ng; g.beginPath(); g.ellipse(cx, ny + 4, 26, 16, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(110,55,45,.45)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 7, ny + 7, 4, 2.6, sx * 0.4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(cx + 2, ny - 3, 5, 3.5, 0, 0, 7); g.fill();
  }
  if (f.nose === 'dot') { g.fillStyle = 'rgba(110,55,45,.45)'; g.beginPath(); g.arc(cx - 6, ny + 4, 3.5, 0, 7); g.arc(cx + 6, ny + 4, 3.5, 0, 7); g.fill(); }
  drawMouth(g, skin, ex.mouth ?? f.mouth, cx, eyeY + 126);
}
