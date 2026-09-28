/* ================= app registry & opening files ================= */
const Apps = {
  reg: {},
  def(id, spec) { this.reg[id] = Object.assign({ id }, spec); },
  launch(id, args) {
    args = args || {};
    const a = this.reg[id]; if (!a) return null;
    Launcher.hide(); Pop.close();
    if (a.alias) return a.alias(args);
    Panel.bump(id);
    const wins = WM.wins.filter(w => w.app === id);
    if (a.single && wins.length) { WM.focus(wins[0]); if (a.reuse) a.reuse(wins[0], args); return wins[0]; }
    if (a.keyOf) { const k = a.keyOf(args); const w = k != null && wins.find(x => x.key === k); if (w) { WM.focus(w); if (a.reuse) a.reuse(w, args); return w; } }
    return a.open(args);
  }
};
function openPath(p) {
  const n = FS.get(p);
  if (!n) { Dialog.alert('Could not open location', `“${FS.short(p)}” does not exist. It may have been moved to the Trash.`); return; }
  openNode(n, p);
}
function openNode(node, path) {
  path = path || FS.path(node);
  if (node.type === 'dir') return Apps.launch('files', { path });
  if (node.type === 'app') return Apps.launch(node.app, Object.assign({}, node.args || {}));
  const ext = extOf(node.name);
  if (node.kind === 'resume' || ext === 'pdf') return Apps.launch('pdf', { path });
  if (node.kind === 'img' || ext === 'png' || ext === 'jpg') return Apps.launch('images', { path });
  if (node.bin) return Dialog.alert('No app for this file', `There is no application installed that can open “${node.name}”.`);
  return Apps.launch('editor', { path });
}

/* ================= window manager ================= */
const WM = {
  wins: [], z: 100, seq: 0, active: null,
  area() {
    const os = $('#os'), W = os.clientWidth, H = os.clientHeight, p = $('#panel');
    const sat = Safe.top, ph = p ? p.offsetHeight : 48;
    return { x: 0, y: sat, w: W, h: Math.max(200, H - sat - ph) };
  },
  open(o) {
    const A = this.area(), phone = isPhone();
    const w = Math.round(Math.min(o.w || 720, A.w - 24)), h = Math.round(Math.min(o.h || 480, A.h - 20));
    const n = this.wins.length % 7;
    let x = o.x != null ? o.x : Math.round(A.x + (A.w - w) / 2 + (n - 3) * 26);
    let y = o.y != null ? o.y : Math.round(A.y + Math.max(10, (A.h - h) / 2 - 30 + (n - 3) * 22));
    x = clamp(x, 0, Math.max(0, A.w - w)); y = clamp(y, A.y, Math.max(A.y, A.y + A.h - h));
    const win = { id: 'w' + (++this.seq), app: o.app, title: o.title, icon: o.icon, key: o.key, rect: { x, y, w, h }, max: false, min: false, above: false, minW: o.minW || 300, minH: o.minH || 200 };
    const bMin = el('button.tbb', { title: 'Minimize', 'aria-label': 'Minimize', html: li('min') });
    const bMax = el('button.tbb', { title: 'Maximize', 'aria-label': 'Maximize', html: li('max') });
    const bClose = el('button.tbb.x', { title: 'Close', 'aria-label': 'Close', html: li('close') });
    const tb = el('div.tb', {}, el('span.tb-ic', { html: icon(o.icon) }), el('span.tb-title', { text: o.title }), el('div.tb-btns', {}, o.noMin ? null : bMin, o.noMax ? null : bMax, bClose));
    const body = el('div.wbody');
    const node = el('div.win.opening' + (o.noResize ? '.noresize' : ''), { 'data-app': o.app, role: 'dialog', 'aria-label': o.title }, tb, body,
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => { const hd = el('div.rz.' + d); hd.addEventListener('pointerdown', e => this.startResize(e, win, d)); return hd; }));
    Object.assign(win, { el: node, body, tb, bMax });
    this.place(win);
    $('#wins').append(node);
    bMin.addEventListener('click', e => { e.stopPropagation(); this.minimize(win); });
    bMax.addEventListener('click', e => { e.stopPropagation(); this.toggleMax(win); });
    bClose.addEventListener('click', e => { e.stopPropagation(); this.close(win); });
    node.addEventListener('pointerdown', () => { if (this.active !== win) this.focus(win); }, true);
    tb.addEventListener('pointerdown', e => this.startDrag(e, win));
    tb.addEventListener('dblclick', e => { if (!e.target.closest('.tbb') && !o.noMax) this.toggleMax(win); });
    onCtx(tb, e => Menu.show(e.clientX, e.clientY, [
      { label: 'Minimize', icon: 'min', action: () => this.minimize(win), disabled: o.noMin },
      { label: win.max ? 'Restore' : 'Maximize', icon: win.max ? 'restore' : 'max', action: () => this.toggleMax(win), disabled: o.noMax },
      { label: 'Keep Above Others', checked: win.above, action: () => { win.above = !win.above; this.focus(win); } },
      { sep: true },
      { label: 'Close', icon: 'close', kbd: 'Ctrl+W', action: () => this.close(win) }
    ]));
    this.wins.push(win);
    this.focus(win);
    if (phone || o.max) this.maximize(win, false);
    try { o.render && o.render(body, win); } catch (err) { console.error(err); body.append(el('div.empty', { text: 'This app hit an error while starting.' })); }
    setTimeout(() => node.classList.remove('opening'), 220);
    if (win.onFocus) setTimeout(() => { if (WM.active === win) win.onFocus(); }, 40);
    Bus.emit('wins');
    return win;
  },
  place(win) { const r = win.rect; const s = win.el.style; s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px'; },
  setTitle(win, t) { win.title = t; win.el.querySelector('.tb-title').textContent = t; win.el.setAttribute('aria-label', t); Bus.emit('wins'); },
  resizeTo(win, w, h) {
    if (win.max) return;
    const A = this.area(); win.rect.w = Math.min(w, A.w); win.rect.h = Math.min(h, A.h);
    win.rect.x = clamp(win.rect.x, 0, Math.max(0, A.w - win.rect.w)); win.rect.y = clamp(win.rect.y, A.y, Math.max(A.y, A.y + A.h - win.rect.h));
    this.animate(win); this.place(win);
  },
  focus(win) {
    if (!win || win.closed) return;
    if (win.min) this.restore(win);
    this.wins.forEach(w => w.el.classList.toggle('active', w === win));
    win.el.style.zIndex = (win.above ? 5000 : 0) + (++this.z);
    this.active = win;
    if (win.onFocus) setTimeout(() => win.onFocus(), 0);
    Bus.emit('wins');
  },
  blur() { this.active = null; this.wins.forEach(w => w.el.classList.remove('active')); Bus.emit('wins'); },
  topmost() { return this.wins.filter(w => !w.min).sort((a, b) => (+b.el.style.zIndex) - (+a.el.style.zIndex))[0]; },
  close(win, force) {
    if (!win || win.closed) return;
    if (!force && win.beforeClose && win.beforeClose() === false) return;
    win.closed = true;
    win.el.classList.add('closing');
    try { win.onClose && win.onClose(); } catch (e) { console.error(e); }
    (win.cleanups || []).forEach(f => { try { f(); } catch (e) { /* ignore */ } });
    setTimeout(() => win.el.remove(), 160);
    this.wins = this.wins.filter(w => w !== win);
    if (this.active === win) { this.active = null; const t = this.topmost(); if (t) this.focus(t); }
    Bus.emit('wins');
  },
  closeAll() { this.wins.slice().forEach(w => this.close(w, true)); },
  minimize(win) {
    if (win.min) return;
    const b = Panel.taskBtn(win.app), r = win.el.getBoundingClientRect();
    const br = b ? b.getBoundingClientRect() : { left: r.left + r.width / 2, top: window.innerHeight, width: 0, height: 0 };
    win.el.style.setProperty('--mx', (br.left + br.width / 2 - (r.left + r.width / 2)) + 'px');
    win.el.style.setProperty('--my', (br.top + br.height / 2 - (r.top + r.height / 2)) + 'px');
    win.el.classList.add('mtrans');
    requestAnimationFrame(() => win.el.classList.add('mini'));
    win.min = true; if (win.onVis) win.onVis(false);
    setTimeout(() => { if (win.min) win.el.classList.add('minimized'); win.el.classList.remove('mtrans'); }, 250);
    if (this.active === win) { this.active = null; win.el.classList.remove('active'); const t = this.topmost(); if (t) this.focus(t); }
    Bus.emit('wins');
  },
  restore(win) {
    if (!win.min) return;
    win.min = false; if (win.onVis) win.onVis(true);
    win.el.classList.remove('minimized');
    win.el.classList.add('mtrans');
    requestAnimationFrame(() => requestAnimationFrame(() => win.el.classList.remove('mini')));
    setTimeout(() => win.el.classList.remove('mtrans'), 260);
  },
  animate(win) { win.el.classList.add('anim'); clearTimeout(win._at); win._at = setTimeout(() => { win.el.classList.remove('anim'); win.onResize && win.onResize(); }, 220); },
  setMaxIcon(win) { if (win.bMax) { win.bMax.innerHTML = li(win.max ? 'restore' : 'max'); win.bMax.title = win.max ? 'Restore' : 'Maximize'; } },
  maximize(win, anim) {
    if (!win.max && !win.snap) win.prev = Object.assign({}, win.rect);
    win.max = true; win.snap = null;
    const A = this.area(); win.rect = { x: A.x, y: A.y, w: A.w, h: A.h };
    if (anim !== false) this.animate(win);
    win.el.classList.add('max'); this.place(win); this.setMaxIcon(win);
    win.onResize && win.onResize();
  },
  unmax(win) {
    if (isPhone()) return;
    win.max = false; win.snap = null; win.el.classList.remove('max');
    const A = this.area();
    win.rect = win.prev ? Object.assign({}, win.prev) : { x: A.w * 0.15, y: A.y + 40, w: A.w * 0.7, h: A.h * 0.7 };
    this.animate(win); this.place(win); this.setMaxIcon(win);
  },
  toggleMax(win) { if (win.max || win.snap) this.unmax(win); else this.maximize(win); },
  snapTo(win, side) {
    if (!win.max && !win.snap) win.prev = Object.assign({}, win.rect);
    const A = this.area(), half = Math.round(A.w / 2);
    win.max = false; win.el.classList.remove('max'); win.snap = side;
    win.rect = side === 'left' ? { x: 0, y: A.y, w: half, h: A.h } : { x: A.w - half, y: A.y, w: half, h: A.h };
    this.animate(win); this.place(win); this.setMaxIcon(win);
  },
  showSnap(zone) {
    const s = $('#snap'), A = this.area();
    if (!zone) { s.classList.remove('on'); return; }
    const r = zone === 'max' ? { x: 6, y: A.y + 6, w: A.w - 12, h: A.h - 12 } : zone === 'left' ? { x: 6, y: A.y + 6, w: A.w / 2 - 12, h: A.h - 12 } : { x: A.w / 2 + 6, y: A.y + 6, w: A.w / 2 - 12, h: A.h - 12 };
    Object.assign(s.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    s.classList.add('on');
  },
  startDrag(e, win) {
    if (e.button !== 0 || e.target.closest('.tbb')) return;
    const tb = win.tb, sx = e.clientX, sy = e.clientY, pid = e.pointerId;
    let start = Object.assign({}, win.rect), started = false, zone = null;
    try { tb.setPointerCapture(pid); } catch (err) { /* ignore */ }
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!started) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        if ((win.max || win.snap) && isPhone()) return;
        started = true; $('#os').classList.add('dragging');
        if (win.max || win.snap) {
          const prev = win.prev || { w: Math.round(win.rect.w * 0.7), h: Math.round(win.rect.h * 0.75) };
          const ratio = (sx - win.rect.x) / win.rect.w;
          win.max = false; win.snap = null; win.el.classList.remove('max'); this.setMaxIcon(win);
          start = { x: sx - prev.w * ratio, y: win.rect.y, w: prev.w, h: prev.h };
          win.rect = Object.assign({}, start); win.onResize && win.onResize();
        }
        this.place(win); win.el.classList.add('moving');
      }
      const A = this.area();
      win.rect.x = clamp(start.x + dx, -start.w + 90, A.w - 90);
      win.rect.y = clamp(start.y + dy, A.y, A.y + A.h - 40);
      win.el.style.transform = `translate3d(${win.rect.x - start.x}px,${win.rect.y - start.y}px,0)`;
      zone = ev.clientY <= A.y + 3 ? 'max' : ev.clientX <= 3 ? 'left' : ev.clientX >= A.w - 4 ? 'right' : null;
      this.showSnap(zone);
    };
    const up = () => {
      tb.removeEventListener('pointermove', move); tb.removeEventListener('pointerup', up); tb.removeEventListener('pointercancel', up);
      $('#os').classList.remove('dragging'); this.showSnap(null);
      if (started) { win.el.style.transform = ''; win.el.classList.remove('moving'); this.place(win); }
      if (started && zone) { if (zone === 'max') { win.prev = Object.assign({}, win.rect); win.rect = win.prev; this.maximize(win); } else this.snapTo(win, zone); }
    };
    tb.addEventListener('pointermove', move); tb.addEventListener('pointerup', up); tb.addEventListener('pointercancel', up);
  },
  startResize(e, win, d) {
    if (e.button !== 0 || win.max) return;
    e.stopPropagation(); e.preventDefault();
    const h = e.currentTarget, sx = e.clientX, sy = e.clientY, s = Object.assign({}, win.rect), A = this.area();
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    $('#os').classList.add('resizing'); win.snap = null;
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy, r = win.rect;
      if (d.includes('e')) r.w = Math.max(win.minW, s.w + dx);
      if (d.includes('w')) { r.w = Math.max(win.minW, s.w - dx); r.x = s.x + s.w - r.w; }
      if (d.includes('s')) r.h = Math.max(win.minH, s.h + dy);
      if (d.includes('n')) { r.h = Math.max(win.minH, s.h - dy); r.y = s.y + s.h - r.h; if (r.y < A.y) { r.h -= A.y - r.y; r.y = A.y; } }
      this.place(win); win.onResize && win.onResize();
    };
    const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); $('#os').classList.remove('resizing'); };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  },
  fit() {
    const A = this.area(), phone = isPhone();
    this.wins.forEach(w => {
      if (phone && !w.max) this.maximize(w, false);
      if (w.max) { w.rect = { x: A.x, y: A.y, w: A.w, h: A.h }; this.place(w); }
      else if (w.snap) this.snapTo(w, w.snap);
      else { w.rect.w = Math.min(w.rect.w, A.w); w.rect.h = Math.min(w.rect.h, A.h); w.rect.x = clamp(w.rect.x, -w.rect.w + 90, A.w - 90); w.rect.y = clamp(w.rect.y, A.y, A.y + A.h - 40); this.place(w); }
      w.onResize && w.onResize();
    });
  }
};
const Safe = { top: 0, bottom: 0, measure() { const p = el('div', { style: { position: 'fixed', paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)', visibility: 'hidden' } }); document.body.append(p); const cs = getComputedStyle(p); this.top = parseFloat(cs.paddingTop) || 0; this.bottom = parseFloat(cs.paddingBottom) || 0; p.remove(); } };

/* ================= context menus ================= */
const Menu = {
  stack: [],
  get isOpen() { return this.stack.length > 0; },
  show(x, y, items, opts) { this.hide(); this.open(items, x, y, 0, null, opts || {}); },
  open(items, x, y, level, anchor, opts) {
    const m = el('div.menu', { role: 'menu' });
    items.filter(Boolean).forEach(it => {
      if (it.sep) { m.append(el('div.msep')); return; }
      if (it.header) { m.append(el('div.mhead', { text: it.header })); return; }
      const row = el('div.mi' + (it.disabled ? '.dis' : '') + (it.bold ? '.bold' : ''), { role: 'menuitem' },
        el('span.mic', { html: it.checked != null ? (it.checked ? li('check') : '') : it.svg ? it.svg : it.icon ? li(it.icon) : '' }),
        el('span.ml', { text: it.label }),
        it.kbd ? el('span.k', { text: it.kbd }) : null,
        it.sub ? el('span.k', { html: li('fwd') }) : null);
      const openSub = () => {
        this.closeFrom(level + 1);
        $$('.mi.open', m).forEach(r => r.classList.remove('open'));
        if (it.sub) { row.classList.add('open'); const r = row.getBoundingClientRect(); this.open(it.sub, r.right - 3, r.top - 6, level + 1, r, {}); }
      };
      row.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') openSub(); });
      row.addEventListener('click', e => { e.stopPropagation(); if (it.sub) { openSub(); return; } this.hide(); if (it.action) it.action(); });
      m.append(row);
    });
    $('#os').append(m);
    const W = window.innerWidth, H = window.innerHeight, r = m.getBoundingClientRect();
    let left = x, top = opts.above ? opts.above.top - r.height - 6 : y;
    if (left + r.width > W - 4) left = anchor ? anchor.left - r.width + 3 : W - r.width - 4;
    if (top + r.height > H - 4) top = H - r.height - 4;
    m.style.left = Math.max(4, left) + 'px'; m.style.top = Math.max(4, top) + 'px';
    this.stack[level] = m;
  },
  closeFrom(level) { while (this.stack.length > level) { const m = this.stack.pop(); if (m) m.remove(); } },
  hide() { this.closeFrom(0); }
};

/* ================= dialogs ================= */
const Dialog = {
  open({ title, text, body, buttons, wide }) {
    return new Promise(res => {
      const back = el('div.dlg-back');
      const box = el('div.dlg', { role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title, style: wide ? { width: 'min(480px,100%)' } : null });
      box.append(el('h3', { text: title }));
      if (text) box.append(el('p', { text }));
      if (body) box.append(body);
      const row = el('div.dlg-btns');
      const val = b => typeof b.value === 'function' ? b.value() : b.value;
      const done = v => { back.remove(); document.removeEventListener('keydown', key, true); res(v); };
      const key = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const c = buttons.find(b => b.cancel); done(c ? val(c) : null); }
        else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { const d = buttons.find(b => b.def); if (d) { e.preventDefault(); e.stopPropagation(); done(val(d)); } }
      };
      buttons.forEach(b => row.append(el('button.btn' + (b.kind ? '.' + b.kind : ''), { text: b.label, type: 'button', onclick: () => done(val(b)) })));
      box.append(row); back.append(box);
      back.addEventListener('pointerdown', e => { if (e.target === back) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); } });
      ($('#scr-desk').hidden ? $('#os') : $('#scr-desk')).append(back);
      document.addEventListener('keydown', key, true);
      setTimeout(() => { const f = box.querySelector('input') || row.querySelector('.pri,.dan') || row.lastChild; if (f) f.focus(); }, 40);
    });
  },
  alert(title, text) { Snd.play('error'); return this.open({ title, text, buttons: [{ label: 'OK', kind: 'pri', value: true, def: true, cancel: true }] }); },
  confirm({ title, text, ok, danger }) { return this.open({ title, text, buttons: [{ label: 'Cancel', value: false, cancel: true }, { label: ok || 'OK', kind: danger ? 'dan' : 'pri', value: true, def: true }] }); },
  prompt({ title, label, value, ok, stem }) {
    const inp = el('input.inp', { value: value || '', 'aria-label': label, spellcheck: 'false', autocomplete: 'off' });
    const body = el('label.dlg-field', {}, el('span', { text: label }), inp);
    setTimeout(() => { inp.focus(); const v = inp.value, dot = v.lastIndexOf('.'); if (stem && dot > 0) inp.setSelectionRange(0, dot); else inp.select(); }, 60);
    return this.open({ title, body, buttons: [{ label: 'Cancel', value: null, cancel: true }, { label: ok || 'OK', kind: 'pri', value: () => inp.value.trim(), def: true }] });
  }
};

/* ================= notifications ================= */
const Notif = {
  list: [],
  push(n) {
    n.time = Date.now();
    if (!n.quiet) { this.list.unshift(n); Bus.emit('notif'); }
    if (!Sys.dnd || n.quiet) this.toast(n);
    if (!n.quiet) Snd.play('pop');
  },
  toast(n) {
    const box = $('#toasts'); if (!box || $('#scr-desk').hidden) return;
    const t = el('div.toast', { role: 'status' },
      el('span.ic', { html: icon(n.icon || 'logo') }),
      el('div.grow', {}, el('b', { text: n.title }), n.body ? el('p', { text: n.body }) : null,
        n.actions ? el('div.acts', {}, n.actions.map(a => el('button.btn' + (a.primary ? '.pri' : ''), { text: a.label, onclick: () => { kill(); a.run(); } }))) : null),
      el('button.tx', { 'aria-label': 'Dismiss', html: li('close'), onclick: () => kill() }));
    let timer;
    const kill = () => { clearTimeout(timer); t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    const arm = () => { clearTimeout(timer); timer = setTimeout(kill, n.timeout || 6500); };
    t.addEventListener('pointerenter', () => clearTimeout(timer)); t.addEventListener('pointerleave', arm);
    box.append(t); arm();
    while (box.children.length > 3) box.firstChild.remove();
  }
};

/* ================= panel ================= */
const Panel = {
  pinned: ['files', 'web', 'terminal', 'editor'],
  hiddenByShowDesk: null,
  init() {
    $('#p-launch .app').innerHTML = icon('logo');
    $('#p-launch').addEventListener('click', () => Launcher.toggle());
    $('#p-net').addEventListener('click', () => Pop.toggle('net', $('#p-net')));
    $('#p-vol').addEventListener('click', () => Pop.toggle('vol', $('#p-vol')));
    $('#p-bell').addEventListener('click', () => Pop.toggle('bell', $('#p-bell')));
    $('#p-clock').addEventListener('click', () => Pop.toggle('cal', $('#p-clock')));
    $('#p-desk').addEventListener('click', () => this.showDesktop());
    $('#p-vol').addEventListener('wheel', e => { e.preventDefault(); setVolume(clamp(Prefs.volume + (e.deltaY < 0 ? 0.05 : -0.05), 0, 1)); }, { passive: false });
    onCtx($('#panel'), e => {
      if (e.target.closest('.task')) return;
      Menu.show(e.clientX, e.clientY, [
        { label: 'Show Desktop', icon: 'desktop', action: () => this.showDesktop() },
        { label: 'System Monitor', icon: 'chip', action: () => Apps.launch('monitor') },
        { sep: true },
        { label: 'Panel Settings', icon: 'palette', action: () => Apps.launch('settings', { page: 'appearance' }) }
      ]);
    });
    Bus.on('wins', () => this.render());
    Bus.on('notif', () => this.tray());
    Bus.on('sys', () => this.tray());
    this.tray(); this.render(); this.clock();
    setInterval(() => this.clock(), 1000);
  },
  tray() {
    $('#p-net').innerHTML = li(Sys.wifi ? 'wifi' : 'wifioff');
    $('#p-net').title = Sys.wifi ? `Connected to ${Sys.net}` : 'Wi-Fi is off';
    $('#p-vol').innerHTML = li(Prefs.volume <= 0 ? 'mute' : Prefs.volume < 0.45 ? 'vollow' : 'vol');
    $('#p-vol').title = `Volume ${Math.round(Prefs.volume * 100)}%`;
    $('#p-bell').innerHTML = li(Sys.dnd ? 'belloff' : 'bell') + `<span class="badge${Notif.list.some(n => !n.seen) ? ' on' : ''}"></span>`;
  },
  clock() {
    const d = new Date();
    const t = fmtTime(d), ds = fmtDateShort(d);
    const c = $('#p-clock');
    if (c.dataset.t !== t) { c.querySelector('.t').textContent = t; c.querySelector('.d').textContent = ds; c.dataset.t = t; c.title = fmtDateLong(d); }
  },
  taskBtn(app) { return $(`#tasks .task[data-app="${app}"]`); },
  render() {
    const box = $('#tasks'); if (!box) return;
    const apps = this.pinned.slice();
    WM.wins.forEach(w => { if (!apps.includes(w.app)) apps.push(w.app); });
    $$('.task', box).forEach(b => { if (!apps.includes(b.dataset.app)) b.remove(); });
    apps.forEach((id, i) => {
      const a = Apps.reg[id]; if (!a) return;
      let b = this.taskBtn(id);
      if (!b) {
        b = el('button.pbtn.task', { 'data-app': id, 'aria-label': a.name }, el('span.app', { html: icon(a.icon) }), el('span.ind'));
        b.addEventListener('click', () => this.click(id, b));
        b.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); Apps.reg[id].open({}); } });
        onCtx(b, e => this.taskMenu(id, b, e));
      }
      if (box.children[i] !== b) box.insertBefore(b, box.children[i] || null);
      const ws = WM.wins.filter(w => w.app === id);
      b.classList.toggle('running', ws.length > 0);
      b.classList.toggle('multi', ws.length > 1);
      b.classList.toggle('focused', !!(WM.active && WM.active.app === id && !WM.active.min));
      b.title = ws.length ? ws.map(w => w.title).join('\n') : a.name;
    });
  },
  bump(id) {
    const b = this.taskBtn(id); if (b) { b.classList.remove('launch'); void b.offsetWidth; b.classList.add('launch'); setTimeout(() => b.classList.remove('launch'), 1000); }
    const os = $('#os'); os.classList.add('busy'); clearTimeout(this._busy); this._busy = setTimeout(() => os.classList.remove('busy'), 450);
  },
  click(id, b) {
    const ws = WM.wins.filter(w => w.app === id);
    if (!ws.length) { Apps.launch(id); return; }
    if (ws.length === 1) { const w = ws[0]; if (WM.active === w && !w.min) WM.minimize(w); else WM.focus(w); return; }
    const r = b.getBoundingClientRect();
    Menu.show(r.left, 0, [{ header: Apps.reg[id].name }].concat(ws.map(w => ({ label: w.title, svg: li(w.min ? 'min' : 'max'), action: () => WM.focus(w) })), [{ sep: true }, { label: 'New Window', icon: 'plus', action: () => Apps.reg[id].open({}) }]), { above: r });
  },
  taskMenu(id, b, e) {
    const ws = WM.wins.filter(w => w.app === id), r = b.getBoundingClientRect(), pinned = this.pinned.includes(id);
    Menu.show(r.left, 0, [
      { header: Apps.reg[id].name },
      { label: 'New Window', icon: 'plus', action: () => Apps.reg[id].open({}) },
      { label: pinned ? 'Unpin from Panel' : 'Pin to Panel', icon: 'pin', action: () => { if (pinned) this.pinned = this.pinned.filter(x => x !== id); else this.pinned.push(id); this.render(); } },
      ws.length ? { sep: true } : null,
      ws.length ? { label: ws.length > 1 ? `Close ${ws.length} Windows` : 'Close Window', icon: 'close', action: () => ws.forEach(w => WM.close(w)) } : null
    ], { above: r });
  },
  showDesktop() {
    if (this.hiddenByShowDesk && this.hiddenByShowDesk.length) {
      this.hiddenByShowDesk.forEach(w => { if (!w.closed) WM.focus(w); });
      this.hiddenByShowDesk = null; return;
    }
    const vis = WM.wins.filter(w => !w.min);
    vis.forEach(w => WM.minimize(w));
    this.hiddenByShowDesk = vis;
  }
};
function setVolume(v) {
  Prefs.volume = v; savePrefs();
  if (Snd.master) Snd.master.gain.value = v;
  Panel.tray(); Bus.emit('volume');
}

/* ================= popovers (network, volume, notifications, calendar) ================= */
const Pop = {
  cur: null, name: null, btn: null,
  toggle(name, btn) { if (this.name === name) { this.close(); return; } this.open(name, btn); },
  close() { if (this.cur) this.cur.remove(); if (this.btn) this.btn.classList.remove('on'); this.cur = this.name = this.btn = null; },
  open(name, btn) {
    this.close(); Launcher.hide(); Menu.hide();
    const p = el('div.flyout.pop', { role: 'dialog' });
    this[name](p);
    $('#scr-desk').append(p);
    this.cur = p; this.name = name; this.btn = btn; btn.classList.add('on');
  },
  net(p) {
    const nets = [['NJ-01-Rig', 4, true], ['StormFiber-5G', 3, true], ['PTCL-BB', 2, true], ['COMSATS-Student', 2, true], ['Nayatel-Home', 1, true]];
    const render = () => {
      p.innerHTML = '';
      p.append(el('h5', {}, 'Wi-Fi', toggleSwitch(Sys.wifi, v => { Sys.wifi = v; Bus.emit('sys'); render(); }, 'Wi-Fi')));
      if (!Sys.wifi) { p.append(el('div.prow', {}, el('span', { html: li('wifioff') }), el('div.grow', { text: 'Wi-Fi is off' }))); return; }
      nets.forEach(([name, s, lock]) => {
        const on = Sys.net === name;
        const row = el('div.prow.btnrow', { tabindex: '0', role: 'button' },
          el('div.bars', { html: [5, 8, 11, 14].map((hh, i) => `<i class="${i < s ? 'on' : ''}" style="height:${hh}px"></i>`).join('') }),
          el('div.grow', {}, el('div', { text: name, style: on ? { fontWeight: '600' } : null }), el('small', { text: on ? 'Connected' : lock ? 'Secured' : 'Open' })),
          on ? el('span', { html: li('check'), style: { color: 'var(--accent)' } }) : el('span', { html: li('lock'), style: { color: 'var(--text-faint)' } }));
        row.addEventListener('click', () => {
          if (on) return;
          row.querySelector('small').textContent = 'Connecting…';
          setTimeout(() => { Sys.net = name; Bus.emit('sys'); Notif.push({ title: 'Connection established', body: `You are now connected to “${name}”.`, icon: 'settings' }); if (this.name === 'net') render(); }, 1300);
        });
        p.append(row);
      });
      p.append(el('div.psep'), el('div.prow', {}, el('small', { text: 'Wired: not connected · VPN: none' })));
    };
    render();
  },
  vol(p) {
    const lab = el('span', { text: Math.round(Prefs.volume * 100) + '%', style: { minWidth: '3.5ch', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } });
    const muteB = el('button.ibtn', { 'aria-label': 'Mute', html: li(Prefs.volume <= 0 ? 'mute' : 'vol') });
    const r = el('input.range', { type: 'range', min: '0', max: '100', value: String(Math.round(Prefs.volume * 100)), 'aria-label': 'Output volume' });
    r.addEventListener('input', () => { setVolume(r.value / 100); lab.textContent = r.value + '%'; muteB.innerHTML = li(Prefs.volume <= 0 ? 'mute' : 'vol'); });
    r.addEventListener('change', () => Snd.play('vol'));
    let before = 0.6;
    muteB.addEventListener('click', () => { if (Prefs.volume > 0) { before = Prefs.volume; setVolume(0); } else setVolume(before || 0.6); r.value = Math.round(Prefs.volume * 100); lab.textContent = r.value + '%'; muteB.innerHTML = li(Prefs.volume <= 0 ? 'mute' : 'vol'); });
    p.append(el('h5', { text: 'Sound' }), el('div.prow', {}, muteB, el('div.grow', {}, r), lab),
      el('div.prow', {}, el('div.grow', {}, el('div', { text: 'Built-in Audio' }), el('small', { text: 'Analog Stereo output' }))),
      el('div.psep'),
      el('div.prow', {}, el('div.grow', { text: 'System sounds' }), toggleSwitch(Prefs.sounds, v => { Prefs.sounds = v; savePrefs(); if (v) Snd.play('pop'); }, 'System sounds')));
  },
  bell(p) {
    Notif.list.forEach(n => { n.seen = true; }); Panel.tray();
    const render = () => {
      p.innerHTML = '';
      p.append(el('h5', {}, 'Notifications', Notif.list.length ? el('button.lnk', { text: 'Clear all', onclick: () => { Notif.list = []; Bus.emit('notif'); render(); } }) : null));
      const listBox = el('div', { style: { maxHeight: '320px', overflow: 'auto' } });
      if (!Notif.list.length) listBox.append(el('div.empty', { style: { minHeight: '120px' } }, el('span', { html: li('bell') }), 'No new notifications'));
      Notif.list.forEach(n => listBox.append(el('div.notif', {}, el('span.ic', { html: icon(n.icon || 'logo') }),
        el('div', { style: { flex: '1', minWidth: '0' } }, el('b', { text: n.title }), n.body ? el('p', { text: n.body }) : null,
          n.actions ? el('div', { style: { marginTop: '6px', display: 'flex', gap: '6px' } }, n.actions.map(a => el('button.btn', { text: a.label, style: { height: '26px', fontSize: '12px' }, onclick: () => { Pop.close(); a.run(); } }))) : null),
        el('time', { text: fmtTime(new Date(n.time)) }))));
      p.append(listBox, el('div.psep'), el('div.prow', {}, el('div.grow', { text: 'Do not disturb' }), toggleSwitch(Sys.dnd, v => { Sys.dnd = v; Bus.emit('sys'); }, 'Do not disturb')));
    };
    render();
  },
  cal(p) {
    const now = new Date(); let y = now.getFullYear(), m = now.getMonth();
    const lahore = el('b', { style: { fontVariantNumeric: 'tabular-nums' } });
    const big = el('div.big-time');
    const tick = () => { const d = new Date(); big.textContent = fmtTime(d); lahore.textContent = fmtTime(d, 'Asia/Karachi'); };
    const grid = el('div.cal'), title = el('b');
    const draw = () => {
      title.textContent = new Date(y, m, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
      grid.innerHTML = '';
      ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(d => grid.append(el('span.wd', { text: d })));
      const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
      for (let i = 0; i < 42; i++) {
        const dn = i - first + 1;
        if (dn < 1) grid.append(el('span.mute', { text: prevDays + dn }));
        else if (dn > days) grid.append(el('span.mute', { text: dn - days }));
        else grid.append(el('span' + (y === now.getFullYear() && m === now.getMonth() && dn === now.getDate() ? '.today' : ''), { text: dn }));
      }
    };
    p.append(big, el('div', { text: fmtDateLong(now), style: { color: 'var(--text-dim)', margin: '4px 0 12px', fontSize: '13px' } }),
      el('div.cal-head', {}, title, el('div', {}, ibtn('back', 'Previous month', () => { m--; if (m < 0) { m = 11; y--; } draw(); }), ibtn('fwd', 'Next month', () => { m++; if (m > 11) { m = 0; y++; } draw(); }))),
      grid, el('div.psep'),
      el('div.prow', {}, el('span', { html: li('pin') }), el('div.grow', {}, el('div', { text: "Naji's time · Lahore" }), el('small', { text: 'Pakistan Standard Time (UTC+5)' })), lahore));
    draw(); tick();
    const iv = setInterval(() => { if (!p.isConnected) clearInterval(iv); else tick(); }, 1000);
  }
};
document.addEventListener('pointerdown', e => {
  if (Menu.isOpen && !e.target.closest('.menu')) Menu.hide();
  if (Pop.cur && !e.target.closest('.pop') && !(Pop.btn && Pop.btn.contains(e.target))) Pop.close();
  if (Launcher.el && !Launcher.el.hidden && !e.target.closest('#launcher') && !e.target.closest('#p-launch')) Launcher.hide();
}, true);

/* ================= launcher ================= */
const Launcher = {
  el: null, cat: 'Favorites', kb: -1,
  entries() {
    const R = HOME + '/Desktop/README.md';
    return [
      { id: 'welcome', label: 'Welcome to LithOS', sub: 'Start here', icon: 'logo', cats: ['Favorites', 'Portfolio'], run: () => Apps.launch('welcome') },
      { id: 'readme', label: 'About Me', sub: 'README.md in Text Editor', icon: 'file-md', cats: ['Favorites', 'Portfolio'], run: () => openPath(R), kw: 'readme about naji bio' },
      { id: 'projects', label: 'Projects', sub: 'Seven core samples in ~/Projects', icon: 'folder-projects', cats: ['Favorites', 'Portfolio'], run: () => Apps.launch('files', { path: HOME + '/Projects' }), kw: 'work portfolio case studies' },
      { id: 'resume', label: 'Résumé', sub: 'Resume.pdf in Document Viewer', icon: 'file-pdf', cats: ['Favorites', 'Portfolio'], run: () => openPath(HOME + '/Desktop/Resume.pdf'), kw: 'resume cv' },
      { id: 'skills', label: 'Skills', sub: 'Live in System Monitor', icon: 'monitor', cats: ['Portfolio'], run: () => Apps.launch('monitor', { tab: 'processes' }), kw: 'stack react django' },
      { id: 'contact', label: 'Contact Naji', sub: 'Email, GitHub, LinkedIn', icon: 'contact', cats: ['Favorites', 'Portfolio'], run: () => Apps.launch('contact'), kw: 'email hire' },
      { id: 'site', label: 'naji.codes', sub: 'Portfolio site in Web Browser', icon: 'web', cats: ['Portfolio', 'Internet'], run: () => Apps.launch('web', { url: 'naji.codes' }), kw: 'website' },
      { id: 'web', label: 'Web Browser', sub: 'Browse the web', icon: 'web', cats: ['Favorites', 'Internet'], run: () => Apps.launch('web'), kw: 'firefox chrome internet' },
      { id: 'editor', label: 'Text Editor', sub: 'Edit text and Markdown', icon: 'editor', cats: ['Accessories'], run: () => Apps.launch('editor'), kw: 'gedit notes' },
      { id: 'calc', label: 'Calculator', sub: 'Do the arithmetic', icon: 'calc', cats: ['Accessories'], run: () => Apps.launch('calc') },
      { id: 'images', label: 'Image Viewer', sub: 'Look at pictures', icon: 'images', cats: ['Accessories'], run: () => Apps.launch('images', { path: HOME + '/Pictures/Wallpapers/strata-night.png' }), kw: 'photos' },
      { id: 'pdf', label: 'Document Viewer', sub: 'Read PDF documents', icon: 'pdf', cats: ['Accessories'], run: () => openPath(HOME + '/Desktop/Resume.pdf') },
      { id: 'doom', label: 'DOOM', sub: 'Shareware episode, the real 1993 engine', icon: 'doom', cats: ['Favorites', 'Games'], run: () => Apps.launch('doom'), kw: 'fps shooter game id' },
      { id: 'racer', label: 'Canal Run', sub: '3D night street racing', icon: 'racer', cats: ['Favorites', 'Games'], run: () => Apps.launch('racer'), kw: 'racing car nfs drive game' },
      { id: 'solitaire', label: 'Solitaire', sub: 'Klondike patience', icon: 'cards', cats: ['Games'], run: () => Apps.launch('solitaire'), kw: 'cards klondike patience game' },
      { id: 'chess', label: 'Chess', sub: 'Play against the LithOS engine', icon: 'chess', cats: ['Games'], run: () => Apps.launch('chess'), kw: 'board game' },
      { id: '2048', label: '2048', sub: 'Slide and merge tiles', icon: 'g2048', cats: ['Games'], run: () => Apps.launch('2048'), kw: 'puzzle game' },
      { id: 'brickfall', label: 'Brickfall', sub: 'Break every brick', icon: 'bricks', cats: ['Games'], run: () => Apps.launch('brickfall'), kw: 'breakout arcade game' },
      { id: 'mines', label: 'Mines', sub: 'Clear the field', icon: 'mines', cats: ['Games'], run: () => Apps.launch('mines'), kw: 'minesweeper game' },
      { id: 'snake', label: 'Snake', sub: 'Eat, grow, repeat', icon: 'snake', cats: ['Games'], run: () => Apps.launch('snake'), kw: 'game' },
      { id: 'files', label: 'Files', sub: 'Browse your files', icon: 'files', cats: ['Favorites', 'System'], run: () => Apps.launch('files'), kw: 'nautilus explorer folders' },
      { id: 'terminal', label: 'Terminal', sub: 'Use the command line', icon: 'terminal', cats: ['Favorites', 'System'], run: () => Apps.launch('terminal'), kw: 'bash shell console' },
      { id: 'monitor', label: 'System Monitor', sub: 'Processes and resources', icon: 'monitor', cats: ['System'], run: () => Apps.launch('monitor'), kw: 'htop task manager' },
      { id: 'settings', label: 'Settings', sub: 'Appearance, background, sound', icon: 'settings', cats: ['Favorites', 'System'], run: () => Apps.launch('settings'), kw: 'preferences theme wallpaper dark light' }
    ];
  },
  cats: [['Favorites', 'star'], ['Portfolio', 'brief'], ['Internet', 'globe'], ['Accessories', 'edit'], ['Games', 'spark'], ['System', 'chip'], ['All Applications', 'grid']],
  build() {
    const L = el('div.flyout#launcher', { role: 'dialog', 'aria-label': 'Applications', hidden: true });
    this.search = el('input', { type: 'text', placeholder: 'Type to search…', 'aria-label': 'Search', spellcheck: 'false', autocomplete: 'off' });
    this.list = el('div.ln-list');
    this.catBox = el('div.ln-cats', { role: 'tablist' });
    this.cats.forEach(([c, ic]) => {
      const b = el('button.ln-cat', { 'data-cat': c, role: 'tab', html: li(ic) + `<span>${c}</span>` });
      b.addEventListener('click', () => { this.cat = c; this.search.value = ''; this.render(); });
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !this.search.value) { clearTimeout(this._h); this._h = setTimeout(() => { this.cat = c; this.render(); }, 140); } });
      b.addEventListener('pointerleave', () => clearTimeout(this._h));
      this.catBox.append(b);
    });
    this.search.addEventListener('input', () => { this.kb = 0; this.render(); });
    this.search.addEventListener('keydown', e => {
      const items = $$('.ln-item,.ln-tile', this.list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this.kb = clamp(this.kb + (e.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1); this.paintKb(); }
      else if (e.key === 'Enter') { e.preventDefault(); const it = items[Math.max(0, this.kb)]; if (it) it.click(); }
      else if (e.key === 'Escape') { this.hide(); }
    });
    const pw = (label, ic, fn) => el('button.fbtn', { html: li(ic) + `<span>${label}</span>`, onclick: () => { this.hide(); fn(); } });
    L.append(
      el('div.ln-head', {}, el('div.ln-who', {}, el('div.avatar.sm', { text: 'NU' }), el('div', {}, el('b', { text: 'Naji Ullah' }), el('small', { text: 'naji@nj-01' }))),
        el('label.search', {}, el('span', { html: li('search') }), this.search)),
      el('div.ln-main', {}, this.catBox, this.list),
      el('div.ln-foot', {},
        el('div', {}, pw('Settings', 'gear', () => Apps.launch('settings')), pw('Lock', 'lock', () => Power.lock()), pw('Log Out', 'logout', () => Power.logout(true))),
        el('div', {}, pw('Restart', 'restart', () => Power.ask('restart')), pw('Shut Down', 'power', () => Power.ask('off')))));
    $('#scr-desk').append(L);
    this.el = L;
  },
  paintKb() { $$('.ln-item,.ln-tile', this.list).forEach((n, i) => n.classList.toggle('kb', i === this.kb)); const k = $('.kb', this.list); if (k) k.scrollIntoView({ block: 'nearest' }); },
  item(e, tile) {
    const n = tile
      ? el('div.ln-tile', { role: 'button', tabindex: '-1' }, el('span', { html: icon(e.icon) }), el('span', { text: e.label }))
      : el('div.ln-item', { role: 'button', tabindex: '-1' }, el('span.ic', { html: icon(e.icon) }), el('div.tx', {}, el('b', { text: e.label }), e.sub ? el('small', { text: e.sub }) : null));
    n.addEventListener('click', () => { this.hide(); e.run(); });
    return n;
  },
  render() {
    const q = this.search.value.trim().toLowerCase(), L = this.list;
    L.innerHTML = '';
    $$('.ln-cat', this.catBox).forEach(b => b.classList.toggle('on', !q && b.dataset.cat === this.cat));
    const all = this.entries();
    if (q) {
      const hit = s => s && s.toLowerCase().includes(q);
      const apps = all.filter(e => hit(e.label) || hit(e.sub) || hit(e.kw));
      const files = [];
      const walk = (node, p) => { FS.list(node, false).forEach(n => { const np = p + '/' + n.name; if (hit(n.name) || hit(nodeLabel(n))) files.push([n, np]); if (n.type === 'dir' && files.length < 40) walk(n, np); }); };
      walk(FS.get(HOME), HOME);
      if (apps.length) { L.append(el('div.ln-sec', { text: 'Applications' })); apps.forEach(e => L.append(this.item(e))); }
      if (files.length) { L.append(el('div.ln-sec', { text: 'Files' })); files.slice(0, 12).forEach(([n, p]) => L.append(this.item({ label: nodeLabel(n), sub: FS.short(FS.dir(p)), icon: nodeIcon(n, p), run: () => openNode(n, p) }))); }
      L.append(el('div.ln-sec', { text: 'Terminal' }));
      L.append(this.item({ label: `Run “${this.search.value.trim()}”`, sub: 'Open in Terminal', icon: 'terminal', run: () => Apps.launch('terminal', { run: this.search.value.trim() }) }));
      this.kb = clamp(this.kb, 0, $$('.ln-item', L).length - 1); this.paintKb();
      return;
    }
    const list = this.cat === 'All Applications' ? all.filter(e => !e.cats.includes('Portfolio') || ['web', 'files'].includes(e.id)).sort((a, b) => a.label.localeCompare(b.label)) : all.filter(e => e.cats.includes(this.cat));
    if (this.cat === 'Favorites') { const g = el('div.ln-tiles'); list.forEach(e => g.append(this.item(e, true))); L.append(g); }
    else list.forEach(e => L.append(this.item(e)));
    this.kb = -1;
  },
  toggle() { if (this.el && !this.el.hidden) this.hide(); else this.show(); },
  show() {
    if (!this.el) this.build();
    Pop.close(); Menu.hide();
    this.search.value = ''; this.cat = 'Favorites'; this.render();
    this.el.hidden = false; $('#p-launch').classList.add('on');
    this.el.style.animation = 'none'; void this.el.offsetWidth; this.el.style.animation = '';
    if (!isPhone()) setTimeout(() => this.search.focus(), 30);
  },
  hide() { if (this.el) this.el.hidden = true; const b = $('#p-launch'); if (b) b.classList.remove('on'); }
};

/* ================= file operations shared by desktop & Files ================= */
const Ops = {
  async rename(path) {
    const node = FS.get(path); if (!node) return;
    const nm = await Dialog.prompt({ title: node.type === 'dir' ? 'Rename Folder' : 'Rename File', label: 'Name', value: node.name, ok: 'Rename', stem: node.type === 'file' });
    if (!nm || nm === node.name) return;
    if (nm.includes('/')) return Dialog.alert('Invalid name', 'Names can’t contain “/”.');
    if (node.parent.children[nm]) return Dialog.alert('Name already taken', `“${nm}” already exists in this folder.`);
    FS.rename(node, nm);
  },
  trash(paths) {
    let n = 0;
    paths.forEach(p => { const node = FS.get(p); if (node && !(node.type === 'app' && node.app === 'trash') && p !== HOME) { FS.toTrash(node); n++; } });
    if (n) { Snd.play('trash'); Notif.push({ title: n === 1 ? `“${FS.base(paths[0])}” moved to Trash` : `${n} items moved to Trash`, icon: 'trash-full', quiet: true, timeout: 4000, actions: [{ label: 'Undo', run: () => { for (let i = 0; i < n; i++) FS.restore(FS.trash.length - 1); } }] }); }
  },
  async newFolder(dirPath) {
    const dir = FS.get(dirPath); if (!dir) return;
    const nm = await Dialog.prompt({ title: 'New Folder', label: 'Folder name', value: FS.unique(dir, 'New Folder'), ok: 'Create' });
    if (!nm) return;
    if (nm.includes('/') || dir.children[nm]) return Dialog.alert('Can’t create folder', dir.children[nm] ? `“${nm}” already exists.` : 'Names can’t contain “/”.');
    FS.add(dir, nm, D());
  },
  async newFile(dirPath) {
    const dir = FS.get(dirPath); if (!dir) return;
    const nm = await Dialog.prompt({ title: 'New Text File', label: 'File name', value: FS.unique(dir, 'Untitled Document.txt'), ok: 'Create', stem: true });
    if (!nm) return;
    if (nm.includes('/') || dir.children[nm]) return Dialog.alert('Can’t create file', dir.children[nm] ? `“${nm}” already exists.` : 'Names can’t contain “/”.');
    FS.add(dir, nm, F(''));
  },
  properties(path, trashEntry) {
    const node = trashEntry ? trashEntry.node : FS.get(path); if (!node) return;
    const rows = [['Type', nodeType(node)], ['Location', trashEntry ? 'Trash (from ' + FS.short(trashEntry.from) + ')' : FS.short(FS.dir(path))],
      ['Size', node.type === 'dir' ? `${Object.keys(node.children).length} items` : fmtSize(FS.size(node))], ['Modified', fmtFull(node.mtime)],
      ['Permissions', node.type === 'dir' ? 'drwxr-xr-x naji naji' : node.type === 'app' ? '-rwxr-xr-x naji naji' : '-rw-r--r-- naji naji']];
    if (node.type === 'app') rows.push(['Command', `${node.app}${node.args && node.args.path ? ' ' + FS.short(node.args.path) : ''}`]);
    const body = el('div', {}, el('div.props-head', {}, el('span', { html: icon(nodeIcon(node, path)) }), el('b', { text: nodeLabel(node), style: { fontSize: '15px', wordBreak: 'break-all' } })),
      el('dl.props', {}, rows.map(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])));
    Dialog.open({ title: 'Properties', body, buttons: [{ label: 'Close', kind: 'pri', value: true, def: true, cancel: true }] });
  },
  async emptyTrash() {
    if (!FS.trash.length) return;
    const ok = await Dialog.confirm({ title: 'Empty all items from Trash?', text: 'All items in the Trash will be permanently deleted.', ok: 'Empty Trash', danger: true });
    if (ok) { FS.trash = []; Bus.emit('fs', 'trash://'); Snd.play('trash'); }
  },
  itemMenu(path, node, extra) {
    const isTrash = node.type === 'app' && node.app === 'trash';
    const textish = node.type === 'file' && !node.bin && !node.kind;
    return [
      { label: 'Open', bold: true, action: () => openNode(node, path) },
      node.type === 'file' && !textish && !node.bin ? { label: 'Open With Text Editor', icon: 'edit', action: () => Apps.launch('editor', { path, edit: true }) } : null,
      textish && extOf(node.name) === 'md' ? { label: 'Edit Source', icon: 'edit', action: () => Apps.launch('editor', { path, edit: true }) } : null,
      node.type === 'dir' ? { label: 'Open in Terminal', icon: 'terminal', action: () => Apps.launch('terminal', { cwd: path }) } : null,
      { sep: true },
      isTrash ? { label: 'Empty Trash', icon: 'trash', action: () => this.emptyTrash(), disabled: !FS.trash.length } : { label: 'Rename…', icon: 'edit', kbd: 'F2', action: () => this.rename(path) },
      isTrash ? null : { label: 'Move to Trash', icon: 'trash', kbd: 'Delete', action: () => (extra && extra.trashSel ? extra.trashSel() : this.trash([path])) },
      { label: 'Copy Path', icon: 'copy', action: () => copyText(path, 'Path copied') },
      { sep: true },
      { label: 'Properties', icon: 'info', action: () => this.properties(path) }
    ];
  }
};

/* ================= desktop icons ================= */
const Desk = {
  pos: {}, sel: new Set(), cw: 92, ch: 100, ox: 10, oy: 10,
  dirPath: HOME + '/Desktop',
  init() {
    const box = $('#dicons');
    box.addEventListener('pointerdown', e => { if (e.target === box) this.bgDown(e); });
    onCtx(box, e => { if (e.target === box) this.bgMenu(e); });
    box.addEventListener('keydown', e => this.key(e));
    Bus.on('fs', p => { if (p === this.dirPath || p === 'trash://') this.render(); });
    this.render();
    this.note();
  },
  metrics() { const phone = isPhone(); this.cw = phone ? 88 : 100; this.ch = phone ? 94 : 100; this.oy = 10 + Safe.top; },
  rows() { const A = WM.area(); return Math.max(1, Math.floor((A.h - 16) / this.ch)); },
  cols() { return Math.max(1, Math.floor((window.innerWidth - this.ox) / this.cw)); },
  xy(c, r) { return { x: this.ox + c * this.cw, y: this.oy + r * this.ch }; },
  cellOf(name) { return this.pos[name]; },
  taken(c, r, except) { return Object.keys(this.pos).some(k => k !== except && this.pos[k] && this.pos[k][0] === c && this.pos[k][1] === r); },
  freeCell(except, near) {
    const rows = this.rows(), cols = this.cols();
    if (near) {
      let best = null, bd = 1e9;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (!this.taken(c, r, except)) { const d = Math.hypot(c - near[0], r - near[1]); if (d < bd) { bd = d; best = [c, r]; } }
      return best || [0, 0];
    }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (!this.taken(c, r, except)) return [c, r];
    return [0, 0];
  },
  arrange() { this.pos = {}; this.render(); },
  render() {
    this.metrics();
    const box = $('#dicons'), dir = FS.get(this.dirPath);
    const items = dir ? Object.values(dir.children).filter(n => !n.name.startsWith('.')) : [];
    const order = ['Home.desktop', 'README.md', 'Projects.desktop', 'Resume.pdf', 'Terminal.desktop', 'Web.desktop', 'Skills.desktop', 'Contact.desktop', 'Games.desktop', 'DOOM.desktop', 'Canal Run.desktop', 'Trash.desktop'];
    items.sort((a, b) => { const ia = order.indexOf(a.name), ib = order.indexOf(b.name); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name); });
    Object.keys(this.pos).forEach(k => { if (!dir || !dir.children[k]) delete this.pos[k]; });
    const rows = this.rows();
    items.forEach(n => { const p = this.pos[n.name]; if (!p || p[1] >= rows || this.taken(p[0], p[1], n.name)) this.pos[n.name] = this.freeCell(n.name, p); });
    box.innerHTML = '';
    items.forEach(n => {
      const path = this.dirPath + '/' + n.name, [c, r] = this.pos[n.name], { x, y } = this.xy(c, r);
      const d = el('div.dicon' + (this.sel.has(n.name) ? '.sel' : ''), { 'data-name': n.name, role: 'button', tabindex: '-1', 'aria-label': nodeLabel(n), style: { left: x + 'px', top: y + 'px' } },
        el('span.ic', { html: icon(nodeIcon(n, path)) }), el('span.lb', { text: nodeLabel(n) }));
      d.addEventListener('pointerdown', e => this.iconDown(e, n, d));
      d.addEventListener('dblclick', () => openNode(n, path));
      onCtx(d, e => {
        if (!this.sel.has(n.name)) { this.sel = new Set([n.name]); this.paint(); }
        Menu.show(e.clientX, e.clientY, Ops.itemMenu(path, n, { trashSel: () => Ops.trash([...this.sel].map(s => this.dirPath + '/' + s)) }));
      });
      box.append(d);
    });
  },
  paint() { $$('.dicon', $('#dicons')).forEach(d => d.classList.toggle('sel', this.sel.has(d.dataset.name))); },
  iconDown(e, n, d) {
    if (e.button === 2) return;
    $('#dicons').focus({ preventScroll: true });
    WM.blur();
    if (e.ctrlKey || e.metaKey) { if (this.sel.has(n.name)) this.sel.delete(n.name); else this.sel.add(n.name); this.paint(); return; }
    if (!this.sel.has(n.name)) { this.sel = new Set([n.name]); this.paint(); }
    const sx = e.clientX, sy = e.clientY, touch = e.pointerType === 'touch';
    let dragging = false, target = null;
    const els = $$('.dicon', $('#dicons')).filter(x => this.sel.has(x.dataset.name));
    const origin = els.map(x => [x, parseFloat(x.style.left), parseFloat(x.style.top)]);
    const trashEl = $('.dicon[data-name="Trash.desktop"]');
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dragging) { if (Math.hypot(dx, dy) < 6) return; if (touch && !d._armed) return; dragging = true; els.forEach(x => x.classList.add('drag')); }
      origin.forEach(([x, l, t]) => { x.style.left = l + dx + 'px'; x.style.top = t + dy + 'px'; });
      let tgt = null;
      if (trashEl && !this.sel.has('Trash.desktop')) { const r = trashEl.getBoundingClientRect(); if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) tgt = trashEl; }
      if (tgt !== target) { if (target) target.classList.remove('target'); target = tgt; if (target) target.classList.add('target'); }
    };
    let lpTimer = touch ? setTimeout(() => { d._armed = true; }, 250) : null;
    const up = ev => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
      clearTimeout(lpTimer); d._armed = false;
      if (!dragging) { if (touch && ev.type === 'pointerup' && !recentLP(d)) openNode(n, this.dirPath + '/' + n.name); return; }
      els.forEach(x => x.classList.remove('drag'));
      if (target) { target.classList.remove('target'); Ops.trash([...this.sel].map(s => this.dirPath + '/' + s)); this.sel.clear(); return; }
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      const moved = origin.map(([x]) => x.dataset.name);
      moved.forEach(nm => { delete this.pos[nm]; });
      origin.forEach(([x, l, t]) => {
        const nm = x.dataset.name, c = clamp(Math.round((l + dx - this.ox) / this.cw), 0, this.cols() - 1), r = clamp(Math.round((t + dy - this.oy) / this.ch), 0, this.rows() - 1);
        this.pos[nm] = this.taken(c, r, nm) ? this.freeCell(nm, [c, r]) : [c, r];
      });
      this.render();
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  },
  bgDown(e) {
    if (e.button !== 0) return;
    $('#dicons').focus({ preventScroll: true });
    WM.blur();
    if (!(e.ctrlKey || e.metaKey)) { this.sel.clear(); this.paint(); }
    if (e.pointerType === 'touch') return;
    const box = $('#dicons'), sx = e.clientX, sy = e.clientY, base = new Set(this.sel);
    let lasso = null;
    const move = ev => {
      if (!lasso) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return; lasso = el('div#lasso'); box.append(lasso); }
      const x = Math.min(sx, ev.clientX), y = Math.min(sy, ev.clientY), w = Math.abs(ev.clientX - sx), h = Math.abs(ev.clientY - sy);
      Object.assign(lasso.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      this.sel = new Set(base);
      $$('.dicon', box).forEach(d => { const r = d.getBoundingClientRect(); if (r.left < x + w && r.right > x && r.top < y + h && r.bottom > y) this.sel.add(d.dataset.name); });
      this.paint();
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); if (lasso) lasso.remove(); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  },
  bgMenu(e) {
    Menu.show(e.clientX, e.clientY, [
      { label: 'New', icon: 'plus', sub: [{ label: 'Folder', icon: 'folder', action: () => Ops.newFolder(this.dirPath) }, { label: 'Text File', icon: 'doc', action: () => Ops.newFile(this.dirPath) }] },
      { sep: true },
      { label: 'Open Terminal Here', icon: 'terminal', action: () => Apps.launch('terminal', { cwd: this.dirPath }) },
      { label: 'Open Desktop in Files', icon: 'folder', action: () => Apps.launch('files', { path: this.dirPath }) },
      { label: 'Arrange Icons', icon: 'grid', action: () => this.arrange() },
      { label: 'Show Pinned Note', checked: Prefs.note, action: () => { Prefs.note = !Prefs.note; savePrefs(); this.note(); } },
      { sep: true },
      { label: 'Change Background…', icon: 'image', action: () => Apps.launch('settings', { page: 'background' }) },
      { label: 'Display & Appearance', icon: 'palette', action: () => Apps.launch('settings', { page: 'appearance' }) },
      { sep: true },
      { label: 'About This System', icon: 'info', action: () => Apps.launch('settings', { page: 'about' }) }
    ]);
  },
  key(e) {
    const names = [...this.sel]; if (!names.length && e.key !== 'a') return;
    const paths = names.map(n => this.dirPath + '/' + n);
    if (e.key === 'Enter') { paths.forEach(p => openPath(p)); }
    else if (e.key === 'Delete') { Ops.trash(paths); this.sel.clear(); }
    else if (e.key === 'F2' && paths[0]) { e.preventDefault(); Ops.rename(paths[0]); }
    else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.sel = new Set(Object.keys(this.pos)); this.paint(); }
  },
  note() {
    let n = $('.note');
    if (!Prefs.note) { if (n) n.remove(); return; }
    if (n) return;
    n = el('div.note', { role: 'note' },
      el('button.nx', { 'aria-label': 'Hide note', title: 'Hide note', html: li('close'), onclick: () => { Prefs.note = false; savePrefs(); this.note(); } }),
      el('h4', { text: 'Start here' }),
      el('ul', { html: '<li>Double-click <b>README.md</b> to meet me</li><li><b>Projects</b> holds seven case studies</li><li>Try <code>neofetch</code> in Terminal</li><li>Right-click anything</li>' }),
      el('div.sig', { text: '– N.' }));
    let sx, sy, ox, oy, drag = false;
    n.addEventListener('pointerdown', e => { if (e.target.closest('.nx')) return; drag = true; sx = e.clientX; sy = e.clientY; const r = n.getBoundingClientRect(); ox = r.left; oy = r.top; n.setPointerCapture(e.pointerId); n.style.cursor = 'grabbing'; });
    n.addEventListener('pointermove', e => { if (!drag) return; n.style.left = clamp(ox + e.clientX - sx, 0, window.innerWidth - 60) + 'px'; n.style.top = clamp(oy + e.clientY - sy, 0, window.innerHeight - 100) + 'px'; n.style.right = 'auto'; });
    n.addEventListener('pointerup', () => { drag = false; n.style.cursor = ''; });
    $('#scr-desk').insertBefore(n, $('#snap'));
  }
};
