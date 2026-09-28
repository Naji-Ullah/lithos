'use strict';
/* ================= core helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isPhone = () => window.innerWidth <= 640;
const HOME = '/home/naji';

function el(spec, props, ...kids) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(spec) || [];
  const node = document.createElement(m[1] || 'div');
  if (m[2]) m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') node.classList.add(v); else node.id = v; });
  if (props) for (const k of Object.keys(props)) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'value') node.value = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}

const Bus = {
  h: {},
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); return () => { this.h[e] = (this.h[e] || []).filter(x => x !== f); }; },
  emit(e, ...a) { (this.h[e] || []).slice().forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); }
};

const Store = {
  get(k, d) { try { const v = localStorage.getItem('lithos:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('lithos:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const Prefs = Object.assign({ mode: 'auto', accent: 'amber', wall: 'auto', volume: 0.6, sounds: true, welcome: true, note: true, fmView: 'grid', hidden: false }, Store.get('prefs', {}));
const savePrefs = () => Store.set('prefs', Prefs);

const Sys = { wifi: true, net: 'NJ-01-Rig', bootAt: Date.now(), dnd: false };

/* ================= theme ================= */
const ACCENTS = {
  amber: { name: 'Amber', night: '#eaa53e', day: '#b16809' },
  clay: { name: 'Clay', night: '#e5835c', day: '#b24f2b' },
  moss: { name: 'Moss', night: '#a3c86c', day: '#4f7a22' },
  slate: { name: 'Slate', night: '#82b3dc', day: '#2f6795' },
  iris: { name: 'Iris', night: '#b7a1f2', day: '#6a4fc0' },
  rose: { name: 'Rose', night: '#ec93b3', day: '#b0426b' }
};
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function viewerDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return true; }
}
function effMode() { return Prefs.mode === 'auto' ? (viewerDark() ? 'night' : 'day') : Prefs.mode; }
let lastMode = null;
function applyTheme() {
  const os = $('#os'), m = effMode();
  os.classList.toggle('night', m === 'night');
  os.classList.toggle('day', m === 'day');
  const a = ACCENTS[Prefs.accent] || ACCENTS.amber, c = a[m];
  os.style.setProperty('--accent', c);
  os.style.setProperty('--accent-ink', m === 'night' ? '#1b1408' : '#ffffff');
  os.style.setProperty('--accent-soft', hexA(c, m === 'night' ? 0.2 : 0.14));
  if (lastMode !== m) { lastMode = m; Bus.emit('theme', m); }
  Bus.emit('accent');
}
function cssVar(name) { return getComputedStyle($('#os')).getPropertyValue(name).trim(); }

/* ================= sound ================= */
const Snd = {
  ctx: null, master: null,
  ensure() {
    try {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        this.ctx = new C();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master.gain.value = Prefs.volume;
      return this.ctx;
    } catch (e) { return null; }
  },
  tone(f, t0, dur, type, g) {
    const c = this.ensure(); if (!c) return;
    const o = c.createOscillator(), gn = c.createGain(), t = c.currentTime + t0;
    o.type = type || 'sine'; o.frequency.value = f;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g || 0.1, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, g) {
    const c = this.ensure(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const s = c.createBufferSource(), gn = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1800;
    s.buffer = b; gn.gain.value = g; s.connect(f); f.connect(gn); gn.connect(this.master); s.start();
  },
  play(name) {
    if (!Prefs.sounds || Prefs.volume <= 0) return;
    switch (name) {
      case 'login':
        [[392, 0], [523.25, 0.11], [659.25, 0.22], [783.99, 0.33], [1046.5, 0.5]].forEach(([f, t], i) => this.tone(f, t, 1.3 - i * 0.1, 'sine', 0.09));
        this.tone(196, 0, 1.8, 'triangle', 0.05); break;
      case 'logout':
        [[783.99, 0], [659.25, 0.1], [523.25, 0.2], [392, 0.3]].forEach(([f, t]) => this.tone(f, t, 0.8, 'sine', 0.08)); break;
      case 'pop': this.tone(988, 0, 0.12, 'sine', 0.07); this.tone(1480, 0.06, 0.16, 'sine', 0.05); break;
      case 'error': this.tone(330, 0, 0.14, 'triangle', 0.12); this.tone(247, 0.1, 0.22, 'triangle', 0.12); break;
      case 'click': this.tone(1800, 0, 0.03, 'square', 0.015); break;
      case 'trash': this.noise(0.28, 0.25); break;
      case 'boom': this.noise(0.7, 0.5); this.tone(60, 0, 0.5, 'sine', 0.35); break;
      case 'eat': this.tone(660, 0, 0.07, 'square', 0.03); this.tone(990, 0.05, 0.08, 'square', 0.03); break;
      case 'win': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, i * 0.09, 0.4, 'triangle', 0.08)); break;
      case 'vol': this.tone(880, 0, 0.09, 'sine', 0.12); break;
    }
  }
};

/* ================= line icons (24px, stroke) ================= */
const LI = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 15.8a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none"/>',
  wifioff: '<path d="M3.5 3.5l17 17"/><path d="M8.6 15.8a5 5 0 0 1 5.4-1M5.5 12.5a9.5 9.5 0 0 1 3.8-2.2M2.5 9a14 14 0 0 1 4.3-2.8M13.5 5.6A14 14 0 0 1 21.5 9M16.6 10.9a9.5 9.5 0 0 1 1.9 1.6"/><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none"/>',
  vol: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  vollow: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  belloff: '<path d="M6 16.5V11a6 6 0 0 1 .6-2.6M9 5.8A6 6 0 0 1 18 11v4M18.5 18.5h-14L6 16.5"/><path d="M10 20.5a2 2 0 0 0 4 0M3.5 3.5l17 17"/>',
  power: '<path d="M12 3.5v8"/><path d="M7 6.5a7.5 7.5 0 1 0 10 0"/>',
  restart: '<path d="M19.5 12A7.5 7.5 0 1 1 17 6.4"/><path d="M17.5 2.8v3.9h-3.9"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  logout: '<path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
  min: '<path d="M6.5 12.5h11"/>',
  max: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  restore: '<rect x="5.5" y="8.5" width="10" height="10" rx="1.5"/><path d="M8.5 5.5h8.5a1.5 1.5 0 0 1 1.5 1.5v8.5"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  back: '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
  fwd: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
  down: '<path d="M5.5 9l6.5 6.5L18.5 9"/>',
  up: '<path d="M12 19V5.5M6 11.5l6-6 6 6"/>',
  reload: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19.2 4.3v4h-4"/>',
  grid: '<rect x="4.5" y="4.5" width="6" height="6" rx="1"/><rect x="13.5" y="4.5" width="6" height="6" rx="1"/><rect x="4.5" y="13.5" width="6" height="6" rx="1"/><rect x="13.5" y="13.5" width="6" height="6" rx="1"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="5" cy="6.5" r=".9" fill="currentColor"/><circle cx="5" cy="12" r=".9" fill="currentColor"/><circle cx="5" cy="17.5" r=".9" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M5 7h14M9.5 7V5h5v2M7 7l1 12.5h8L17 7"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  ext: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/><path d="M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  save: '<path d="M5 5.5a1 1 0 0 1 1-1h10l3 3v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4.5v4h7v-4M8 19.5v-6h8v6"/>',
  edit: '<path d="M4.5 19.5l1-4.5L15.5 5a2 2 0 0 1 3 3L8.5 18z"/>',
  zin: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6M11 8v6"/>',
  zout: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6"/>',
  fit: '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l5-5 4 4 2.5-2.5L20 17"/><circle cx="15.5" cy="9.5" r="1.3"/>',
  terminal: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 9.5l3 2.5-3 2.5M12 15h5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  code: '<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>',
  brief: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3.5 12.5h17"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-3 3-3 14 0 17M12 3.5c3 3 3 14 0 17"/>',
  home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
  folder: '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.5l2 2H19A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  desktop: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  doc: '<path d="M6.5 3.5h7l4 4v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M13.5 3.5v4h4M9 12.5h6M9 16h6"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  video: '<rect x="3.5" y="6" width="12.5" height="12" rx="2"/><path d="M16 10.5l4.5-2.5v8L16 13.5"/>',
  layers: '<path d="M12 4 3.5 8.5 12 13l8.5-4.5z"/><path d="M3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  drive: '<rect x="3.5" y="7.5" width="17" height="9" rx="2"/><path d="M7 12h5"/><circle cx="16.5" cy="12" r=".9" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.3"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-.8 1.6-1.8-.3-1.3.4-2.2 1.7-2.2H18a2.5 2.5 0 0 0 2.5-2.5c0-5.4-3.9-10.5-8.5-10.5z"/><circle cx="8" cy="11" r="1.1" fill="currentColor"/><circle cx="11" cy="7.5" r="1.1" fill="currentColor"/><circle cx="15.3" cy="8.5" r="1.1" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  flag: '<path d="M6 21V4.5M6 5h11l-2.5 4L17 13H6"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
  chip: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
  kebab: '<circle cx="12" cy="5.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor" stroke="none"/>',
  wrap: '<path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-4M4 18h5"/><path d="M14.5 16l-2 2 2 2"/>',
  star: '<path d="M12 4l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.8l-5 2.6 1-5.6-4.1-3.9 5.6-.7z"/>',
  spark: '<path d="M12 3.5l1.8 5.4 5.7 1.6-5.7 1.7L12 17.5l-1.8-5.3-5.7-1.7 5.7-1.6z"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5v-6a1.5 1.5 0 0 1 3 0v6M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3.8 14a1.5 1.5 0 0 1 2.4-1.8L8 14"/>',
  undo: '<path d="M8.5 5.5 4 10l4.5 4.5"/><path d="M4 10h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  gear: '<circle cx="12" cy="12" r="2.8"/><path d="M12 3.5l1.6 2.3 2.8-.5.6 2.7 2.5 1.4-1 2.6 1 2.6-2.5 1.4-.6 2.7-2.8-.5L12 20.5l-1.6-2.3-2.8.5-.6-2.7-2.5-1.4 1-2.6-1-2.6 2.5-1.4.6-2.7 2.8.5z"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'
};
function li(name, cls) {
  return `<svg class="li${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LI[name] || ''}</svg>`;
}

/* ================= app & file icons (48px, flat) ================= */
const B = fill => `<rect x="4" y="4" width="40" height="40" rx="10" fill="${fill}"/><path d="M4 14A10 10 0 0 1 14 4h20a10 10 0 0 1 10 10v6H4z" fill="#fff" fill-opacity=".07"/>`;
const FG = {
  home: '<path d="M24 22.5l-7.5 6.2V36h5.2v-4.6h4.6V36h5.2v-7.3z"/>',
  projects: '<path d="M24 22l8.5 4.3L24 30.6l-8.5-4.3z"/><path d="M15.5 30l8.5 4.3 8.5-4.3" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
  docs: '<path d="M18.5 22h8.5l3.5 3.5V36h-12z"/>',
  pics: '<path d="M15.5 36l6-7.5 3.8 4.3 3.2-3.8 5 7z"/><circle cx="29.5" cy="25" r="2.2"/>',
  down: '<path d="M24 22v10.5M19.5 28l4.5 4.5 4.5-4.5M17.5 36.5h13" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  music: '<path d="M22 34.5a3 3 0 1 1-2-2.8V23l10-2v11.5a3 3 0 1 1-2-2.8V24.3l-6 1.2z"/>',
  video: '<path d="M20.5 23v12l10-6z"/>',
  desktop: '<rect x="16" y="22" width="16" height="11" rx="1.5"/><path d="M20.5 36.5h7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  drawer: '<rect x="16.5" y="23" width="15" height="11" rx="1.5"/><path d="M21 27.5h6" fill="none" stroke="#6f93b8" stroke-width="2" stroke-linecap="round"/>',
  root: '<rect x="15.5" y="24" width="17" height="9" rx="2"/>',
  games: '<path d="M18.5 24h11a4.5 4.5 0 0 1 4.4 3.6l1.1 5.6a2.2 2.2 0 0 1-3.7 2l-2.8-2.7h-9l-2.8 2.7a2.2 2.2 0 0 1-3.7-2l1.1-5.6a4.5 4.5 0 0 1 4.4-3.6z"/>'
};
function folderIcon(g, c1, c2) {
  c1 = c1 || '#e3a13f'; c2 = c2 || '#b8762a';
  return `<path d="M5 13.5A3.5 3.5 0 0 1 8.5 10H18l4 4h17.5A3.5 3.5 0 0 1 43 17.5V37a3.5 3.5 0 0 1-3.5 3.5h-31A3.5 3.5 0 0 1 5 37z" fill="${c2}"/><path d="M5 20.5A3.5 3.5 0 0 1 8.5 17h31a3.5 3.5 0 0 1 3.5 3.5V37a3.5 3.5 0 0 1-3.5 3.5h-31A3.5 3.5 0 0 1 5 37z" fill="${c1}"/><path d="M8.5 18h31" stroke="#fff" stroke-opacity=".3"/>${g ? `<g fill="#fff" fill-opacity=".66" stroke-opacity=".66">${FG[g]}</g>` : ''}`;
}
function fileIcon(label, band) {
  const page = 'M12.5 4H29.5L38 12.5V42.5A1.5 1.5 0 0 1 36.5 44h-24A1.5 1.5 0 0 1 11 42.5v-37A1.5 1.5 0 0 1 12.5 4z';
  return `<path d="${page}" fill="#f6f3ee"/><path d="${page}" fill="none" stroke="#000" stroke-opacity=".15"/><path d="M29.5 4v7a1.5 1.5 0 0 0 1.5 1.5h7z" fill="#d9d2c7"/><path d="M15.5 17h14M15.5 21h17M15.5 25h12" stroke="#bdb4a8" stroke-width="1.7" stroke-linecap="round"/>${label ? `<rect x="11" y="30" width="27" height="10" fill="${band}"/><text x="24.5" y="37.6" text-anchor="middle" font-family="Red Hat Text,Arial,sans-serif" font-weight="700" font-size="7.4" fill="#fff" letter-spacing=".4">${label}</text>` : ''}`;
}
function gearPath(cx, cy, r1, r2, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2 * Math.PI / n, w = Math.PI / n;
    [[r1, a - w * 0.95], [r2, a - w * 0.5], [r2, a + w * 0.5], [r1, a + w * 0.95]].forEach(([r, t]) => pts.push((cx + r * Math.cos(t)).toFixed(2) + ' ' + (cy + r * Math.sin(t)).toFixed(2)));
  }
  return 'M' + pts.join('L') + 'Z';
}
const CORE_LOGO = `<rect x="3" y="3" width="42" height="42" rx="11" fill="#1d1a18"/>` +
  [[12, 18.5, '#e2c186'], [18.5, 25, '#cf8a3c'], [25, 31.5, '#a65b3d'], [31.5, 38, '#5d6b78']].map(([a, b, c]) => `<path d="M15 ${a}A9 3 0 0 0 33 ${a}V${b}A9 3 0 0 1 15 ${b}Z" fill="${c}"/>`).join('') +
  `<ellipse cx="24" cy="12" rx="9" ry="3" fill="#f3dfb2"/><rect x="17" y="13.5" width="2" height="23" rx="1" fill="#fff" fill-opacity=".16"/>`;
const ICON_SRC = {
  logo: CORE_LOGO,
  welcome: CORE_LOGO,
  folder: folderIcon(), 'folder-home': folderIcon('home'), 'folder-projects': folderIcon('projects'), 'folder-docs': folderIcon('docs'),
  'folder-pics': folderIcon('pics'), 'folder-down': folderIcon('down'), 'folder-music': folderIcon('music'), 'folder-video': folderIcon('video'),
  'folder-desktop': folderIcon('desktop'), 'folder-root': folderIcon('root', '#8e9aa6', '#6c7784'),
  files: folderIcon('drawer', '#6f93b8', '#4f7092'),
  file: fileIcon(), 'file-md': fileIcon('MD', '#4f74c9'), 'file-pdf': fileIcon('PDF', '#c9443a'), 'file-txt': fileIcon('TXT', '#7f8792'),
  'file-png': fileIcon('PNG', '#2f9a74'), 'file-sh': fileIcon('SH', '#3b3b3b'), 'file-bin': fileIcon('BIN', '#5b5147'), 'file-html': fileIcon('HTML', '#d06a2c'),
  terminal: B('#2b2724') + '<path d="M13 17.5l6.5 6.5-6.5 6.5" fill="none" stroke="#eaa53e" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 31h11" stroke="#f0eae3" stroke-width="3.2" stroke-linecap="round"/>',
  web: '<circle cx="24" cy="24" r="17" fill="#2d77ad"/><path d="M24 7c-5.5 4.5-5.5 29.5 0 34M24 7c5.5 4.5 5.5 29.5 0 34M7.5 19h33M7.5 29h33" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.6"/><ellipse cx="24" cy="24" rx="21.5" ry="7" transform="rotate(-24 24 24)" fill="none" stroke="#eaa53e" stroke-width="2.6"/><circle cx="39.6" cy="13.2" r="2.8" fill="#eaa53e"/>',
  editor: B('#3c6f8f') + '<rect x="11.5" y="10" width="19" height="27" rx="2" fill="#f6f3ee"/><path d="M15 16h12M15 20h12M15 24h8" stroke="#9fb3c2" stroke-width="1.8" stroke-linecap="round"/><path d="M37 18.5 25 30.5l-1.7 5.2 5.2-1.7 12-12z" fill="#eaa53e"/><path d="M23.3 35.7l1.2-3.7 2.5 2.5z" fill="#1b1408"/>',
  pdf: B('#b8453a') + '<path d="M14.5 9h13.5l7 7v21.5A1.5 1.5 0 0 1 33.5 39h-19A1.5 1.5 0 0 1 13 37.5v-27A1.5 1.5 0 0 1 14.5 9z" fill="#f6f3ee"/><path d="M28 9v5.5a1.5 1.5 0 0 0 1.5 1.5H35z" fill="#d9d2c7"/><path d="M17 22h13M17 26h13M17 30h9" stroke="#c9beb2" stroke-width="1.8" stroke-linecap="round"/>',
  images: B('#2f6d97') + '<rect x="10" y="12" width="28" height="24" rx="2.5" fill="#e3eef5"/><path d="M10 31.5l8.5-8.5 6.5 6.5 4-4 9 9v-1A2.5 2.5 0 0 1 35.5 36h-23A2.5 2.5 0 0 1 10 33.5z" fill="#3f8a67"/><circle cx="30.5" cy="18.5" r="3" fill="#eaa53e"/>',
  monitor: B('#1d2622') + '<path d="M10 16h28M10 24h28M10 32h28" stroke="#fff" stroke-opacity=".08"/><path d="M9 27h7l3-8 5 14 4-10 3 4h8" fill="none" stroke="#7ccf7a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  settings: B('#566170') + `<path d="${gearPath(24, 24, 11, 14.5, 8)}" fill="#dfe4ea"/><circle cx="24" cy="24" r="4.5" fill="#566170"/>`,
  calc: B('#3a3f46') + '<rect x="11" y="10" width="26" height="9" rx="2" fill="#cfe0c4"/><g fill="#737b86"><rect x="11" y="22.5" width="7" height="5" rx="1.2"/><rect x="20.5" y="22.5" width="7" height="5" rx="1.2"/><rect x="30" y="22.5" width="7" height="5" rx="1.2"/><rect x="11" y="29" width="7" height="5" rx="1.2"/><rect x="20.5" y="29" width="7" height="5" rx="1.2"/><rect x="30" y="29" width="7" height="5" rx="1.2"/><rect x="11" y="35.5" width="7" height="3.5" rx="1.2"/><rect x="20.5" y="35.5" width="7" height="3.5" rx="1.2"/></g><rect x="30" y="35.5" width="7" height="3.5" rx="1.2" fill="#eaa53e"/>',
  mines: B('#4a5361') + '<path d="M4 17h40M4 31h40M17 4v40M31 4v40" stroke="#fff" stroke-opacity=".07"/><g stroke="#15181c" stroke-width="2.4" stroke-linecap="round"><path d="M24 12v24M12 24h24M15.5 15.5l17 17M32.5 15.5l-17 17"/></g><circle cx="24" cy="24" r="8" fill="#15181c"/><circle cx="21" cy="21" r="2.2" fill="#fff" fill-opacity=".85"/>',
  snake: B('#2b6a45') + '<path d="M11 33h11a4 4 0 0 0 4-4v-8a4 4 0 0 1 4-4h7" fill="none" stroke="#b9e58c" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="17" r="1.2" fill="#1d3d29"/><circle cx="14" cy="15" r="3" fill="#e5584d"/>',
  contact: B('#2e7b76') + '<circle cx="24" cy="19" r="6" fill="#f3efe9"/><path d="M12.5 36c1.5-6 6-9 11.5-9s10 3 11.5 9z" fill="#f3efe9"/>',
  doom: B('#240b07') + '<path d="M4 44V30c4 4 6-6 10-2s4-8 8-3 5-7 9-2 4-6 8-1 5 3 5 3v19z" fill="#b3361f"/><path d="M4 44v-8c4 3 7-4 10 0s5-5 9-1 6-4 9 0 6-3 9 0 3 2 3 2v7z" fill="#e2772a"/><g fill="#eadcc0"><rect x="18.9" y="9.0" width="3.45" height="3.45"/><rect x="22.3" y="9.0" width="3.45" height="3.45"/><rect x="25.7" y="9.0" width="3.45" height="3.45"/><rect x="15.5" y="12.4" width="3.45" height="3.45"/><rect x="18.9" y="12.4" width="3.45" height="3.45"/><rect x="22.3" y="12.4" width="3.45" height="3.45"/><rect x="25.7" y="12.4" width="3.45" height="3.45"/><rect x="29.1" y="12.4" width="3.45" height="3.45"/><rect x="12.1" y="15.8" width="3.45" height="3.45"/><rect x="15.5" y="15.8" width="3.45" height="3.45"/><rect x="18.9" y="15.8" width="3.45" height="3.45"/><rect x="22.3" y="15.8" width="3.45" height="3.45"/><rect x="25.7" y="15.8" width="3.45" height="3.45"/><rect x="29.1" y="15.8" width="3.45" height="3.45"/><rect x="32.5" y="15.8" width="3.45" height="3.45"/><rect x="12.1" y="19.2" width="3.45" height="3.45"/><rect x="22.3" y="19.2" width="3.45" height="3.45"/><rect x="32.5" y="19.2" width="3.45" height="3.45"/><rect x="12.1" y="22.6" width="3.45" height="3.45"/><rect x="15.5" y="22.6" width="3.45" height="3.45"/><rect x="18.9" y="22.6" width="3.45" height="3.45"/><rect x="22.3" y="22.6" width="3.45" height="3.45"/><rect x="25.7" y="22.6" width="3.45" height="3.45"/><rect x="29.1" y="22.6" width="3.45" height="3.45"/><rect x="32.5" y="22.6" width="3.45" height="3.45"/><rect x="12.1" y="26.0" width="3.45" height="3.45"/><rect x="15.5" y="26.0" width="3.45" height="3.45"/><rect x="18.9" y="26.0" width="3.45" height="3.45"/><rect x="25.7" y="26.0" width="3.45" height="3.45"/><rect x="29.1" y="26.0" width="3.45" height="3.45"/><rect x="32.5" y="26.0" width="3.45" height="3.45"/><rect x="15.5" y="29.4" width="3.45" height="3.45"/><rect x="18.9" y="29.4" width="3.45" height="3.45"/><rect x="22.3" y="29.4" width="3.45" height="3.45"/><rect x="25.7" y="29.4" width="3.45" height="3.45"/><rect x="29.1" y="29.4" width="3.45" height="3.45"/><rect x="15.5" y="32.8" width="3.45" height="3.45"/><rect x="22.3" y="32.8" width="3.45" height="3.45"/><rect x="29.1" y="32.8" width="3.45" height="3.45"/></g>',
  racer: B('#15182a') + '<path d="M6 44L20 13h8l14 31z" fill="#2f3346"/><path d="M24 15v3M24 21v4M24 28v6" stroke="#eaa53e" stroke-width="1.6"/><rect x="14" y="26" width="20" height="10" rx="3" fill="#eaa53e"/><rect x="17" y="22" width="14" height="6" rx="2" fill="#27304a"/><rect x="15" y="30" width="5" height="2" fill="#ff3b3b"/><rect x="28" y="30" width="5" height="2" fill="#ff3b3b"/><rect x="15" y="35" width="4" height="3.5" rx="1" fill="#0b0b0b"/><rect x="29" y="35" width="4" height="3.5" rx="1" fill="#0b0b0b"/><path d="M7 12h8M33 9h9M35 15h6" stroke="#d65bd6" stroke-width="1.6" stroke-linecap="round"/>',
  cards: B('#1f5a3f') + '<g transform="rotate(-12 20 26)"><rect x="9" y="11" width="19" height="27" rx="2.5" fill="#fbf8f2"/><path d="M18.5 19c3.6 2.8 5.4 4.8 5.4 6.6a2.7 2.7 0 0 1-4.5 2l.9 2.9h-3.6l.9-2.9a2.7 2.7 0 0 1-4.5-2c0-1.8 1.8-3.8 5.4-6.6z" fill="#1d1b19"/></g><g transform="rotate(10 30 26)"><rect x="20" y="12" width="19" height="27" rx="2.5" fill="#fbf8f2"/><path d="M29.5 31.5c-4-3-6.2-5.2-6.2-7.2a3.1 3.1 0 0 1 6.2-.8 3.1 3.1 0 0 1 6.2.8c0 2-2.2 4.2-6.2 7.2z" fill="#c1352b"/></g>',
  chess: B('#3b2c22') + '<path d="M4 30h8v8H4zM20 30h8v8h-8zM36 30h8v8h-8zM12 38h8v6h-8zM28 38h8v6h-8z" fill="#fff" fill-opacity=".06"/><path d="M16 39h17v-3c0-5-2.5-7-2.5-12 0-5-3-9-8.5-10l-1 3-2.2-1.2-.8 3.2-4.3 5.5 1.2 3.2 3.4-1 3.3-2c.2 3.3-3 5.4-5.4 8.6z" fill="#f1e6d2"/><rect x="14" y="38" width="21" height="3.5" rx="1.2" fill="#f1e6d2"/>',
  g2048: B('#8f7a66') + '<rect x="9" y="9" width="30" height="30" rx="5" fill="#edc22e"/><text x="24" y="28.5" text-anchor="middle" font-family="Red Hat Display,Arial,sans-serif" font-weight="800" font-size="10.5" fill="#fff">2048</text>',
  bricks: B('#1c2030') + '<rect x="8" y="10" width="9" height="4" rx="1" fill="#e2c186"/><rect x="19.5" y="10" width="9" height="4" rx="1" fill="#e2c186"/><rect x="31" y="10" width="9" height="4" rx="1" fill="#e2c186"/><rect x="8" y="16" width="9" height="4" rx="1" fill="#cf8a3c"/><rect x="31" y="16" width="9" height="4" rx="1" fill="#cf8a3c"/><rect x="8" y="22" width="9" height="4" rx="1" fill="#a65b3d"/><rect x="19.5" y="22" width="9" height="4" rx="1" fill="#a65b3d"/><circle cx="25" cy="31" r="2.6" fill="#fff"/><rect x="15" y="37" width="18" height="3.5" rx="1.75" fill="#eaa53e"/>',
  'folder-games': folderIcon('games'),
  trash: '<path d="M13.5 16h21l-2 24.5a2 2 0 0 1-2 1.8H17.5a2 2 0 0 1-2-1.8z" fill="#a7b0ba"/><path d="M19.5 20.5v17M24 20.5v17M28.5 20.5v17" stroke="#7d8793" stroke-width="1.8" stroke-linecap="round"/><rect x="10.5" y="11" width="27" height="5" rx="1.5" fill="#c6ccd3"/><rect x="20" y="7.5" width="8" height="3.5" rx="1" fill="#c6ccd3"/>',
  'trash-full': '<path d="M15 16.5l2.5-8 6.5 2.8 4.8-4.3 5.7 9.5z" fill="#f4efe6"/><path d="M25.5 8l4.5 8" stroke="#eaa53e" stroke-width="2"/><path d="M13.5 16h21l-2 24.5a2 2 0 0 1-2 1.8H17.5a2 2 0 0 1-2-1.8z" fill="#a7b0ba"/><path d="M19.5 20.5v17M24 20.5v17M28.5 20.5v17" stroke="#7d8793" stroke-width="1.8" stroke-linecap="round"/><g transform="rotate(-16 11 16)"><rect x="10.5" y="11" width="27" height="5" rx="1.5" fill="#c6ccd3"/><rect x="20" y="7.5" width="8" height="3.5" rx="1" fill="#c6ccd3"/></g>'
};
function icon(name) { return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ICON_SRC[name] || ICON_SRC.file}</svg>`; }

/* ================= small utilities ================= */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtTime(d, tz) { try { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz }); } catch (e) { return d.toTimeString().slice(0, 5); } }
function fmtDateShort(d) { return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function fmtDateLong(d) { try { return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return fmtDateShort(d); } }
function fmtStamp(t) { const d = new Date(t); return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fmtFull(t) { const d = new Date(t); return `${fmtDateShort(d)} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fmtSize(n) { if (n < 1024) return n + ' bytes'; if (n < 1048576) return (n / 1024).toFixed(1) + ' kB'; return (n / 1048576).toFixed(1) + ' MB'; }
function uptimeStr() { const m = Math.max(1, Math.round((Date.now() - Sys.bootAt) / 60000)); return m < 60 ? `${m} min${m === 1 ? '' : 's'}` : `${Math.floor(m / 60)} hour${m >= 120 ? 's' : ''}, ${m % 60} mins`; }
function extOf(name) { const i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }

/* context menu + long-press binding (touch devices get long-press) */
function onCtx(node, handler) {
  let t = null, sx = 0, sy = 0;
  node.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    if (node._lp && Date.now() - node._lp < 900) return;
    handler(e);
  });
  node.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    sx = e.clientX; sy = e.clientY; clearTimeout(t);
    const target = e.target;
    t = setTimeout(() => { t = null; node._lp = Date.now(); handler({ clientX: sx, clientY: sy, target, preventDefault() {}, stopPropagation() {} }); }, 560);
  });
  node.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 9) { clearTimeout(t); t = null; } });
  ['pointerup', 'pointercancel'].forEach(ev => node.addEventListener(ev, () => { clearTimeout(t); t = null; }));
}
const recentLP = node => node._lp && Date.now() - node._lp < 900;

function ibtn(name, title, onclick, cls) {
  return el('button.ibtn' + (cls ? '.' + cls : ''), { title, 'aria-label': title, html: li(name), onclick });
}
function toggleSwitch(on, onchange, label) {
  const b = el('button.tgl', { role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label || 'Toggle' });
  b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v ? 'true' : 'false'); onchange(v); });
  return b;
}
async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    Notif.push({ title: label || 'Copied to clipboard', body: text, icon: 'files', quiet: true, timeout: 2600 });
    return true;
  } catch (e) {
    const inp = el('input.inp.selectable', { value: text, readonly: true });
    Dialog.open({ title: 'Copy this manually', text: 'The clipboard is blocked here. Select the text below and copy it.', body: inp, buttons: [{ label: 'Done', kind: 'pri', value: true, def: true, cancel: true }] });
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    return false;
  }
}
