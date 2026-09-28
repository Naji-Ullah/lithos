/* ================= generated wallpapers ================= */
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

function drawStrata(c, w, h, mode) {
  const night = mode !== 'day', R = mulberry(night ? 11 : 12);
  const hz = Math.round(h * 0.4);
  let g = c.createLinearGradient(0, 0, 0, hz);
  if (night) { g.addColorStop(0, '#07090f'); g.addColorStop(0.5, '#131426'); g.addColorStop(0.84, '#32212e'); g.addColorStop(1, '#6a3a29'); }
  else { g.addColorStop(0, '#86b1cf'); g.addColorStop(0.55, '#c3d9e4'); g.addColorStop(1, '#f2dcbd'); }
  c.fillStyle = g; c.fillRect(0, 0, w, hz + 60);
  if (night) {
    const n = Math.round(w * hz / 3200);
    for (let i = 0; i < n; i++) {
      const x = R() * w, y = R() * hz * 0.92, s = R() * 1.3 + 0.3;
      c.fillStyle = `rgba(255,246,230,${(0.15 + R() * 0.75) * (1 - y / hz * 0.8)})`; c.fillRect(x, y, s, s);
    }
    const mx = w * 0.16, my = hz * 0.3, mr = Math.max(8, h * 0.018);
    let mg = c.createRadialGradient(mx, my, mr, mx, my, mr * 7); mg.addColorStop(0, 'rgba(255,236,200,.18)'); mg.addColorStop(1, 'rgba(255,236,200,0)');
    c.fillStyle = mg; c.fillRect(mx - mr * 8, my - mr * 8, mr * 16, mr * 16);
    c.fillStyle = '#efe2c6'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.fillStyle = '#131426'; c.beginPath(); c.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, 7); c.fill();
  } else {
    const sg = c.createRadialGradient(w * 0.2, hz * 0.95, 10, w * 0.2, hz * 0.95, h * 0.45);
    sg.addColorStop(0, 'rgba(255,240,210,.85)'); sg.addColorStop(1, 'rgba(255,240,210,0)');
    c.fillStyle = sg; c.fillRect(0, 0, w, hz + 2);
  }
  const hg = c.createRadialGradient(w * 0.72, hz, 10, w * 0.72, hz, w * 0.5);
  hg.addColorStop(0, night ? 'rgba(234,140,70,.28)' : 'rgba(255,220,170,.4)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg; c.fillRect(0, 0, w, hz + 2);
  c.beginPath(); c.moveTo(0, hz + 2);
  for (let x = 0; x <= w + 10; x += 8) c.lineTo(x, hz - h * (0.02 + 0.014 * Math.sin(x * 0.0031 + 1.3) + 0.008 * Math.sin(x * 0.011 + 0.4) + 0.003 * Math.sin(x * 0.041)));
  c.lineTo(w, hz + 2); c.closePath(); c.fillStyle = night ? '#1b1420' : '#b9a78f'; c.fill();

  const pal = night
    ? ['#3b2d24', '#5a4331', '#4a4039', '#6b4f36', '#534a44', '#3e342d', '#58402e', '#35302d', '#453a32', '#2a2522', '#1d1a18']
    : ['#b58d62', '#d6b384', '#bdb1a0', '#cf9a61', '#a99c8a', '#9a7b58', '#8f8375', '#806650', '#6f6358', '#5d524a', '#4a423c'];
  const n = pal.length, step = 5, cols = Math.ceil(w / step) + 2, bounds = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, base = hz + (h - hz + 40) * Math.pow(t, 1.1), amp = h * (0.004 + 0.016 * t);
    const f1 = 0.002 + R() * 0.004, f2 = 0.007 + R() * 0.01, p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28;
    const row = new Float32Array(cols);
    for (let k = 0; k < cols; k++) {
      const x = k * step;
      let y = i === 0 ? hz + 1.2 * Math.sin(x * 0.02) : base + amp * Math.sin(x * f1 + p1) + amp * 0.5 * Math.sin(x * f2 + p2) + amp * 1.4 * Math.sin((x / w) * Math.PI * 1.3 + p3);
      if (i > 0) y = Math.max(y, bounds[i - 1][k] + 3);
      row[k] = y;
    }
    bounds.push(row);
  }
  for (let i = 0; i < n; i++) {
    const top = bounds[i], bot = bounds[i + 1];
    c.beginPath(); c.moveTo(0, top[0]);
    for (let k = 1; k < cols; k++) c.lineTo(k * step, top[k]);
    for (let k = cols - 1; k >= 0; k--) c.lineTo(k * step, bot[k]);
    c.closePath(); c.fillStyle = pal[i]; c.fill();
    c.beginPath(); c.moveTo(0, top[0]);
    for (let k = 1; k < cols; k++) c.lineTo(k * step, top[k]);
    c.strokeStyle = night ? 'rgba(0,0,0,.38)' : 'rgba(70,45,20,.2)'; c.lineWidth = 1; c.stroke();
    const style = i % 3, avg = (bot[cols >> 1] - top[cols >> 1]);
    const count = Math.floor(w * Math.max(avg, 4) / (style === 1 ? 110 : 55));
    for (let j = 0; j < count; j++) {
      const k = Math.floor(R() * (cols - 1)), x = k * step + R() * step, y = top[k] + (bot[k] - top[k]) * R();
      c.fillStyle = R() < 0.5 ? `rgba(255,240,220,${0.03 + R() * 0.08})` : `rgba(0,0,0,${0.05 + R() * 0.12})`;
      if (style === 1) c.fillRect(x, y, 3 + R() * 12, 1); else c.fillRect(x, y, 1 + R() * 1.4, 1 + R() * 1.4);
    }
  }
  // borehole
  const bx = Math.round(w * 0.74), gy = bounds[0][Math.round(bx / step)], by = h * 0.9;
  c.fillStyle = night ? 'rgba(8,7,6,.85)' : 'rgba(40,30,22,.55)'; c.fillRect(bx - 4, gy, 8, by - gy);
  c.fillStyle = night ? 'rgba(234,165,62,.85)' : 'rgba(140,82,18,.85)'; c.fillRect(bx - 0.75, gy, 1.5, by - gy - 9);
  c.beginPath(); c.moveTo(bx - 5, by - 11); c.lineTo(bx + 5, by - 11); c.lineTo(bx, by); c.closePath(); c.fill();
  c.font = '10px "JetBrains Mono", monospace'; c.textBaseline = 'middle';
  for (let d = 1; d <= 8; d++) {
    const y = gy + d * (by - gy) / 9;
    c.fillStyle = night ? 'rgba(255,240,220,.35)' : 'rgba(40,28,18,.45)';
    c.fillRect(bx + 7, y, 7, 1);
    c.fillText(`${d * 12} m`, bx + 18, y);
  }
  // rig
  const s = h * 0.16, ink = night ? '#060608' : '#3d352e';
  c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 2;
  const L0 = [bx - s * 0.3, gy], L1 = [bx - s * 0.05, gy - s], R0 = [bx + s * 0.3, gy], R1 = [bx + s * 0.05, gy - s];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  c.beginPath(); c.moveTo(...L0); c.lineTo(...L1); c.moveTo(...R0); c.lineTo(...R1);
  let prevL = L0, prevR = R0;
  for (let j = 1; j <= 6; j++) {
    const t = j / 7, l = lerp(L0, L1, t), r = lerp(R0, R1, t);
    c.moveTo(...l); c.lineTo(...r); c.moveTo(...prevL); c.lineTo(...r); c.moveTo(...prevR); c.lineTo(...l);
    prevL = l; prevR = r;
  }
  c.stroke(); c.lineWidth = 1;
  c.fillRect(bx - s * 0.1, gy - s - 7, s * 0.2, 7);
  c.fillRect(bx - s * 0.78, gy - s * 0.2, s * 0.36, s * 0.2);
  c.fillRect(bx - s * 0.48, gy - s * 0.3, s * 0.05, s * 0.1);
  if (night) {
    c.fillStyle = '#eaa53e'; c.fillRect(bx - s * 0.7, gy - s * 0.14, s * 0.06, s * 0.05); c.fillRect(bx - s * 0.58, gy - s * 0.14, s * 0.06, s * 0.05);
    const bg = c.createRadialGradient(bx, gy - s - 8, 1, bx, gy - s - 8, 26);
    bg.addColorStop(0, 'rgba(255,90,60,.9)'); bg.addColorStop(1, 'rgba(255,90,60,0)');
    c.fillStyle = bg; c.fillRect(bx - 30, gy - s - 38, 60, 60);
  }
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, night ? 'rgba(0,0,0,.5)' : 'rgba(60,40,20,.16)');
  c.fillStyle = v; c.fillRect(0, 0, w, h);
}

function drawSurvey(c, w, h) {
  const R = mulberry(23);
  c.fillStyle = '#0f1216'; c.fillRect(0, 0, w, h);
  const bg = c.createRadialGradient(w * 0.6, h * 0.45, 0, w * 0.6, h * 0.45, Math.max(w, h) * 0.7);
  bg.addColorStop(0, 'rgba(40,52,66,.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 1;
  const gs = 160;
  c.beginPath();
  for (let x = gs; x < w; x += gs) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); }
  for (let y = gs; y < h; y += gs) { c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); }
  c.stroke();
  const G = 256, perm = new Float32Array(G * G);
  for (let i = 0; i < perm.length; i++) perm[i] = R();
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const i0 = (yi & 255) * G, i1 = ((yi + 1) & 255) * G, x0 = xi & 255, x1 = (xi + 1) & 255;
    const a = perm[i0 + x0], b = perm[i0 + x1], cc = perm[i1 + x0], d = perm[i1 + x1];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
  };
  const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { s += a * vn(x * f + 10, y * f + 20); a *= 0.5; f *= 2.03; } return s; };
  const cs = Math.max(5, Math.round(Math.min(w, h) / 170)), nx = Math.ceil(w / cs) + 1, ny = Math.ceil(h / cs) + 1;
  const V = new Float32Array(nx * ny), sc = 3.4 / Math.max(w, h);
  let mn = 1, mx = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = fbm(i * cs * sc, j * cs * sc); V[j * nx + i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const stepL = (mx - mn) / 34;
  let li = 0;
  for (let L = mn + stepL; L < mx; L += stepL, li++) {
    const major = li % 5 === 0;
    c.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = V[j * nx + i], b = V[j * nx + i + 1], cc = V[(j + 1) * nx + i + 1], d = V[(j + 1) * nx + i];
      const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x0 = i * cs, y0 = j * cs;
      const T = [x0 + cs * (L - a) / (b - a), y0], Rr = [x0 + cs, y0 + cs * (L - b) / (cc - b)];
      const Bt = [x0 + cs * (L - d) / (cc - d), y0 + cs], Lf = [x0, y0 + cs * (L - a) / (d - a)];
      const seg = (p, q) => { c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); };
      switch (idx) {
        case 1: case 14: seg(Lf, Bt); break;
        case 2: case 13: seg(Bt, Rr); break;
        case 3: case 12: seg(Lf, Rr); break;
        case 4: case 11: seg(T, Rr); break;
        case 5: seg(T, Rr); seg(Lf, Bt); break;
        case 6: case 9: seg(T, Bt); break;
        case 7: case 8: seg(Lf, T); break;
        case 10: seg(Lf, T); seg(Bt, Rr); break;
      }
    }
    c.strokeStyle = major ? 'rgba(234,165,62,.5)' : 'rgba(234,165,62,.15)';
    c.lineWidth = major ? 1.3 : 1; c.stroke();
  }
  c.font = '11px "JetBrains Mono", monospace'; c.textBaseline = 'middle';
  const placed = [];
  PROJECTS.forEach((p, i) => {
    let x, y, tries = 0;
    do { x = w * (0.28 + R() * 0.62); y = h * (0.14 + R() * 0.66); tries++; } while (tries < 60 && placed.some(q => Math.hypot(q[0] - x, q[1] - y) < Math.min(w, h) * 0.2));
    placed.push([x, y]);
    c.strokeStyle = 'rgba(234,165,62,.9)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, 6, 0, 7); c.moveTo(x - 11, y); c.lineTo(x + 11, y); c.moveTo(x, y - 11); c.lineTo(x, y + 11); c.stroke();
    c.fillStyle = 'rgba(240,234,227,.8)'; c.fillText(`BH-${p.no}`, x + 14, y - 7);
    c.fillStyle = 'rgba(240,234,227,.45)'; c.fillText(p.name, x + 14, y + 8);
  });
  const sx = w - 190, sy = h - 90;
  c.fillStyle = 'rgba(240,234,227,.55)'; c.fillRect(sx, sy, 150, 2); c.fillRect(sx, sy - 5, 1.5, 10); c.fillRect(sx + 75, sy - 3, 1.5, 6); c.fillRect(sx + 148.5, sy - 5, 1.5, 10);
  c.fillText('0', sx - 3, sy + 14); c.fillText('250', sx + 66, sy + 14); c.fillText('500 m', sx + 136, sy + 14);
  c.fillText('NJ-01 SITE SURVEY · LAHORE', sx, sy - 18);
}

function drawCoreTray(c, w, h) {
  const R = mulberry(31);
  c.fillStyle = '#5b3f29'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < h / 3; i++) {
    const y = R() * h, a = 0.04 + R() * 0.08, amp = 1 + R() * 4, f = 0.002 + R() * 0.01, p = R() * 6;
    c.strokeStyle = R() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,220,180,${a * 0.6})`; c.lineWidth = 0.5 + R() * 1.5;
    c.beginPath(); for (let x = 0; x <= w; x += 20) c.lineTo(x, y + amp * Math.sin(x * f + p)); c.stroke();
  }
  const rows = 6, top = h * 0.09, bottom = h * 0.95, gap = 14, ch = (bottom - top - gap * (rows - 1)) / rows;
  const rock = ['#8b847c', '#b89f7c', '#6f6159', '#cbbb9f', '#514c49', '#a3724e', '#d6cdbf', '#7c8a8a', '#94705a', '#5f6b72'];
  c.font = '600 12px "JetBrains Mono", monospace'; c.textBaseline = 'middle'; c.textAlign = 'right';
  c.textAlign = 'center'; c.fillStyle = 'rgba(255,240,220,.6)'; c.fillText('NJ-01  ·  CORE BOX 3 OF 7  ·  24.00 – 36.00 m', w / 2, top / 2);
  c.textAlign = 'left';
  for (let r = 0; r < rows; r++) {
    const y0 = top + r * (ch + gap);
    const ig = c.createLinearGradient(0, y0, 0, y0 + ch); ig.addColorStop(0, '#2c1e14'); ig.addColorStop(1, '#3f2b1c');
    c.fillStyle = ig; c.fillRect(0, y0, w, ch);
    const d = ch * 0.78, cy = y0 + ch / 2;
    let x = 22; const x1 = w - 96;
    while (x < x1 - 10) {
      let len = 30 + R() * 250; if (x + len > x1) len = x1 - x;
      if (R() < 0.08) {
        for (let k = 0; k < len / 9; k++) { c.fillStyle = rock[Math.floor(R() * rock.length)]; c.beginPath(); c.arc(x + R() * len, cy + (R() - 0.5) * d * 0.7, 2 + R() * d * 0.18, 0, 7); c.fill(); }
      } else {
        const col = rock[Math.floor(R() * rock.length)];
        rrect(c, x, cy - d / 2, len, d, d * 0.2); c.fillStyle = col; c.fill();
        c.save(); c.clip();
        for (let k = 0; k < len * d / 40; k++) { c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.12)'; c.fillRect(x + R() * len, cy - d / 2 + R() * d, 1.5, 1.5); }
        if (R() < 0.35) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1 + R(); c.beginPath(); const vx = x + R() * len; c.moveTo(vx, cy - d / 2); c.lineTo(vx + (R() - 0.5) * d * 1.5, cy + d / 2); c.stroke(); }
        const sg = c.createLinearGradient(0, cy - d / 2, 0, cy + d / 2);
        sg.addColorStop(0, 'rgba(255,255,255,.3)'); sg.addColorStop(0.35, 'rgba(255,255,255,.05)'); sg.addColorStop(0.75, 'rgba(0,0,0,.12)'); sg.addColorStop(1, 'rgba(0,0,0,.45)');
        c.fillStyle = sg; c.fillRect(x, cy - d / 2, len, d);
        c.restore();
      }
      x += len + 2 + R() * 9;
    }
    c.fillStyle = '#efe6d2'; c.fillRect(w - 80, cy - 10, 62, 20);
    c.fillStyle = '#3a2c1c'; c.font = '600 11px "JetBrains Mono", monospace'; c.fillText(`${(24 + r * 2).toFixed(2)} m`, w - 74, cy);
    if (r < rows - 1) {
      c.fillStyle = '#6e4c31'; c.fillRect(0, y0 + ch, w, gap);
      c.fillStyle = 'rgba(255,230,200,.14)'; c.fillRect(0, y0 + ch, w, 1.5);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, y0 + ch + gap - 1.5, w, 1.5);
    }
  }
}

const WALLS = {
  strata: { name: 'Strata', sub: 'Night shift', draw: (c, w, h) => drawStrata(c, w, h, 'night') },
  'strata-day': { name: 'Strata', sub: 'Day shift', draw: (c, w, h) => drawStrata(c, w, h, 'day') },
  survey: { name: 'Survey', sub: 'Site contour map', draw: drawSurvey },
  coretray: { name: 'Core Tray', sub: 'Box 3 of 7', draw: drawCoreTray }
};

const Wall = {
  cache: {}, cur: null,
  resolve() { return Prefs.wall === 'auto' || !WALLS[Prefs.wall] ? (effMode() === 'night' ? 'strata' : 'strata-day') : Prefs.wall; },
  render(force) {
    const id = this.resolve(), cv = $('#wall'), w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (!force && this.cur === id && this.size === w + 'x' + h) return;
    this.cur = id; this.size = w + 'x' + h;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { WALLS[id].draw(c, w, h); } catch (e) { console.error(e); c.fillStyle = '#1d1a18'; c.fillRect(0, 0, w, h); }
  },
  url(id, w, h) {
    const k = `${id}@${w}x${h}`;
    if (this.cache[k]) return this.cache[k];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    WALLS[id].draw(cv.getContext('2d'), w, h);
    return (this.cache[k] = cv.toDataURL('image/jpeg', 0.86));
  },
  set(id) { Prefs.wall = id; savePrefs(); this.render(true); Bus.emit('wall'); }
};
