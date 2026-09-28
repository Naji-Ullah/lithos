/* ================= shared game helpers ================= */
const sfx = (f, d, type, g) => { if (Prefs.sounds && Prefs.volume > 0) Snd.tone(f, 0, d, type || 'square', g || 0.04); };
const fmtClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Could not load ' + src));
    document.head.append(s);
  });
}

/* ================= DOOM (shareware, real engine in WebAssembly) ================= */
Apps.def('doom', {
  name: 'DOOM', icon: 'doom', single: true,
  open() {
    let ex = null, mem = null, raf = 0, alive = true, paused = false, pauseAt = 0, pauseTotal = 0, ctx, img, stage, cv, msg;
    const t0 = performance.now(), held = new Set();
    const now = () => (paused ? pauseAt : performance.now()) - t0 - pauseTotal;
    const KEYS = { 8: 127, 9: 9, 13: 13, 27: 27, 32: 32, 16: 182, 17: 157, 18: 184, 37: 172, 38: 173, 39: 174, 40: 175, 188: 44, 190: 46, 189: 45, 187: 61, 191: 47 };
    const code = e => { const k = e.keyCode; if (KEYS[k] != null) return KEYS[k]; if (k >= 65 && k <= 90) return k + 32; if (k >= 48 && k <= 57) return k; if (k >= 112 && k <= 123) return k + 75; return null; };
    const send = (down, c) => {
      if (!ex || c == null) return;
      if (down) { if (held.has(c)) return; held.add(c); } else { if (!held.has(c)) return; held.delete(c); }
      ex.add_browser_event(down ? 0 : 1, c);
    };
    const releaseAll = () => [...held].forEach(c => send(false, c));
    const fail = text => { msg.hidden = false; msg.innerHTML = ''; msg.append(el('b', { text: 'DOOM couldn’t start' }), el('span', { text })); };
    const loop = () => { if (!alive || paused) return; try { ex.doom_loop_step(); } catch (e) { fail('The engine stopped unexpectedly. Close and reopen DOOM.'); return; } raf = requestAnimationFrame(loop); };
    const setPaused = p => {
      if (!ex || p === paused) return;
      if (p) { paused = true; pauseAt = performance.now(); cancelAnimationFrame(raf); releaseAll(); }
      else { pauseTotal += performance.now() - pauseAt; paused = false; raf = requestAnimationFrame(loop); }
    };
    const fit = () => {
      if (!stage) return;
      const W = stage.clientWidth, H = stage.clientHeight;
      let w = W, h = W * 3 / 4; if (h > H) { h = H; w = H * 4 / 3; }
      cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
    };
    const start = async () => {
      let buf;
      try { const r = await fetch('doom.wasm'); if (!r.ok) throw new Error(String(r.status)); buf = await r.arrayBuffer(); }
      catch (e) { fail('The game file doom.wasm wasn’t found next to this page.'); return; }
      mem = new WebAssembly.Memory({ initial: 108 });
      const noop = () => {};
      const imports = {
        js: {
          js_console_log: noop, js_stdout: noop, js_stderr: noop, js_milliseconds_since_start: now,
          js_draw_screen: ptr => { img.data.set(new Uint8Array(mem.buffer, ptr, 640 * 400 * 4)); ctx.putImageData(img, 0, 0); }
        },
        env: { memory: mem }
      };
      try { const m = await WebAssembly.instantiate(buf, imports); ex = m.instance.exports; }
      catch (e) { fail('This page isn’t allowed to run WebAssembly here. DOOM runs where LithOS is hosted on its own site.'); return; }
      if (!alive) return;
      try { ex.main(); } catch (e) { fail('The engine failed to boot.'); return; }
      msg.hidden = true; raf = requestAnimationFrame(loop); stage.focus({ preventScroll: true });
    };
    return WM.open({
      app: 'doom', title: 'DOOM (Shareware)', icon: 'doom', w: 800, h: 680, minW: 340, minH: 300,
      render(body, w) {
        cv = el('canvas.doom-cv', { width: '640', height: '400', 'aria-label': 'DOOM' });
        ctx = cv.getContext('2d'); img = ctx.createImageData(640, 400);
        msg = el('div.doom-msg', {}, el('b', { text: 'DOOM' }), el('span', { text: 'Loading the engine and Episode 1: Knee-Deep in the Dead…' }));
        stage = el('div.doom', { tabindex: '0' }, cv, msg);
        const help = el('div.doom-help', { html: '<b>↑ ↓ ← →</b> move <b>Ctrl</b> or click fire <b>Space</b> open <b>Shift</b> run <b>Alt</b> strafe <b>1–7</b> weapons <b>Tab</b> map <b>Esc</b> menu' });
        body.append(stage, help);
        const key = (e, down) => {
          if (!ex) return;
          const c = code(e); if (c == null) return;
          e.preventDefault(); e.stopPropagation();
          if (down && e.repeat) return;
          send(down, c);
        };
        stage.addEventListener('keydown', e => key(e, true));
        stage.addEventListener('keyup', e => key(e, false));
        stage.addEventListener('focusout', e => { if (e.relatedTarget && stage.contains(e.relatedTarget)) return; releaseAll(); });
        cv.addEventListener('pointerdown', e => { stage.focus({ preventScroll: true }); if (e.pointerType === 'mouse') { if (e.button === 0) send(true, 157); if (e.button === 2) send(true, 32); } });
        cv.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { if (e.button === 0) send(false, 157); if (e.button === 2) send(false, 32); } });
        cv.addEventListener('contextmenu', e => e.preventDefault());
        if (isPhone() || matchMedia('(pointer: coarse)').matches) {
          const pad = el('div.doom-pad');
          [['▲', 173, 'u'], ['◀', 172, 'l'], ['▶', 174, 'r'], ['▼', 175, 'd'], ['FIRE', 157, 'f'], ['USE', 32, 'o'], ['ENTER', 13, 'e'], ['ESC', 27, 'x']].forEach(([t, c, k]) => {
            const b = el('button.dp.dp-' + k, { text: t, 'aria-label': t, tabindex: '-1' });
            b.addEventListener('pointerdown', ev => { ev.preventDefault(); send(true, c); });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, () => send(false, c)));
            pad.append(b);
          });
          stage.append(pad);
        }
        const ro = new ResizeObserver(fit); ro.observe(stage);
        w.onFocus = () => stage.focus({ preventScroll: true });
        w.onVis = v => setPaused(!v);
        w.cleanups = [() => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); ex = null; }];
        fit(); start();
      }
    });
  }
});

/* ================= Solitaire (Klondike) ================= */
Apps.def('solitaire', {
  name: 'Solitaire', icon: 'cards', single: true,
  open() {
    const SUIT = ['♠︎', '♥︎', '♦︎', '♣︎'], RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const red = s => s === 1 || s === 2;
    let S, hist = [], drawN = 1, cw = 80, ch = 112, gap = 12, board, els = {}, slots = {}, t0 = 0, timer, over = false, moves = 0, score = 0, stTime, stScore, stMoves, finishB, undoB, win;
    const snap = () => JSON.stringify({ S, moves, score });
    const push = () => { hist.push(snap()); if (hist.length > 200) hist.shift(); undoB.disabled = false; };
    const startClock = () => { if (t0) return; t0 = Date.now(); timer = setInterval(stats, 1000); };
    const stats = () => { stTime.textContent = fmtClock(t0 ? (Date.now() - t0) / 1000 : 0); stScore.textContent = score; stMoves.textContent = moves; };
    const deal = () => {
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: s * 13 + r, s, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []] };
      for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) S.tab[j].push(deck.pop());
      S.tab.forEach(c => { c[c.length - 1].up = true; });
      S.stock = deck;
      hist = []; moves = 0; score = 0; over = false; clearInterval(timer); t0 = 0;
      if (undoB) undoB.disabled = true;
      const ov = $('.sol-win', board); if (ov) ov.remove();
      render(); stats();
    };
    const layout = () => {
      const W = board.clientWidth, H = board.clientHeight;
      gap = Math.max(6, Math.round(W * 0.018));
      cw = Math.max(34, Math.min(104, Math.floor((W - gap * 8) / 7), Math.floor((H - gap * 3) / 3.4 / 1.4)));
      ch = Math.round(cw * 1.4);
      board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--ch', ch + 'px');
      const lx = Math.round((W - (cw * 7 + gap * 6)) / 2);
      return i => lx + i * (cw + gap);
    };
    const place = (e, x, y, z) => { e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.zIndex = z; };
    const cardEl = c => {
      let e = els[c.id];
      if (!e) {
        const pip = c.r > 10 ? `<span class="court"><b>${RANK[c.r]}</b><i>${SUIT[c.s]}</i></span>` : c.r === 1 ? `<span class="ace">${SUIT[c.s]}</span>` : `<span class="pip">${SUIT[c.s]}</span>`;
        e = el('div.card' + (red(c.s) ? '.red' : ''), { 'data-id': c.id, html: `<div class="face"><span class="ci tl">${RANK[c.r]}<br>${SUIT[c.s]}</span>${pip}<span class="ci br">${RANK[c.r]}<br>${SUIT[c.s]}</span></div><div class="back"></div>` });
        e.addEventListener('pointerdown', ev => down(ev, c.id));
        els[c.id] = e; board.append(e);
      }
      e.classList.toggle('up', c.up);
      return e;
    };
    const render = () => {
      const X = layout(), top = gap, ty = gap * 2 + ch;
      place(slots.stock, X(0), top, 0); place(slots.waste, X(1), top, 0);
      for (let i = 0; i < 4; i++) place(slots['f' + i], X(3 + i), top, 0);
      for (let i = 0; i < 7; i++) place(slots['t' + i], X(i), ty, 0);
      slots.stock.classList.toggle('recycle', !S.stock.length && S.waste.length > 0);
      S.stock.forEach((c, i) => place(cardEl(c), X(0), top, 10 + i));
      const wv = drawN === 3 ? 3 : 1, wl = S.waste.length;
      S.waste.forEach((c, i) => { const k = Math.max(0, i - (wl - wv)); place(cardEl(c), X(1) + k * Math.round(cw * 0.22), top, 10 + i); });
      S.found.forEach((p, fi) => p.forEach((c, i) => place(cardEl(c), X(3 + fi), top, 10 + i)));
      const avail = board.clientHeight - ty - ch - gap;
      S.tab.forEach((col, ti) => {
        const nDown = col.filter(c => !c.up).length, nUp = col.length - nDown;
        let dOff = ch * 0.1, uOff = ch * 0.27;
        const need = nDown * dOff + Math.max(0, nUp - 1) * uOff;
        if (need > avail && nUp > 1) uOff = Math.max(ch * 0.12, (avail - nDown * dOff) / (nUp - 1));
        let y = ty;
        col.forEach((c, i) => { place(cardEl(c), X(ti), Math.round(y), 10 + i); y += c.up ? uOff : dOff; });
      });
      const auto = !S.stock.length && !S.waste.length && S.tab.every(c => c.every(x => x.up)) && !over && S.found.some(f => f.length < 13);
      finishB.hidden = !auto;
      stats();
    };
    const find = id => {
      for (const k of ['stock', 'waste']) { const i = S[k].findIndex(c => c.id === id); if (i >= 0) return { pile: k, idx: i, arr: S[k] }; }
      for (let f = 0; f < 4; f++) { const i = S.found[f].findIndex(c => c.id === id); if (i >= 0) return { pile: 'found', i: f, idx: i, arr: S.found[f] }; }
      for (let t = 0; t < 7; t++) { const i = S.tab[t].findIndex(c => c.id === id); if (i >= 0) return { pile: 'tab', i: t, idx: i, arr: S.tab[t] }; }
      return null;
    };
    const canFound = (c, f) => { const p = S.found[f]; return p.length ? (p[p.length - 1].s === c.s && p[p.length - 1].r === c.r - 1) : c.r === 1; };
    const canTab = (c, t) => { const p = S.tab[t]; if (!p.length) return c.r === 13; const top = p[p.length - 1]; return top.up && red(top.s) !== red(c.s) && top.r === c.r + 1; };
    const flipTop = () => S.tab.forEach(col => { const t = col[col.length - 1]; if (t && !t.up) { t.up = true; score += 5; } });
    const doMove = (loc, n, dest) => {
      push(); startClock();
      const stack = loc.arr.splice(loc.arr.length - n, n);
      const target = dest.pile === 'found' ? S.found[dest.i] : S.tab[dest.i];
      target.push(...stack);
      if (dest.pile === 'found') score += 10; else if (loc.pile === 'waste') score += 5; else if (loc.pile === 'found') score = Math.max(0, score - 15);
      moves++; flipTop(); render(); sfx(520, 0.05, 'triangle', 0.05);
      checkWin();
    };
    const drawStock = () => {
      if (over) return;
      startClock();
      if (!S.stock.length) {
        if (!S.waste.length) return;
        push(); S.stock = S.waste.reverse().map(c => (c.up = false, c)); S.waste = []; score = Math.max(0, score - (drawN === 1 ? 100 : 20)); moves++; render(); return;
      }
      push();
      for (let i = 0; i < drawN && S.stock.length; i++) { const c = S.stock.pop(); c.up = true; S.waste.push(c); }
      moves++; render(); sfx(700, 0.03, 'triangle', 0.03);
    };
    const smart = id => {
      const loc = find(id); if (!loc) return false;
      const c = loc.arr[loc.idx], n = loc.arr.length - loc.idx;
      if (n === 1 && loc.pile !== 'found') for (let f = 0; f < 4; f++) if (canFound(c, f)) { doMove(loc, 1, { pile: 'found', i: f }); return true; }
      const order = [...Array(7).keys()].sort((a, b) => (S.tab[a].length ? 0 : 1) - (S.tab[b].length ? 0 : 1));
      for (const t of order) if (!(loc.pile === 'tab' && loc.i === t) && canTab(c, t) && !(c.r === 13 && loc.pile === 'tab' && loc.idx === 0)) { doMove(loc, n, { pile: 'tab', i: t }); return true; }
      return false;
    };
    const pileAt = (x, y) => {
      const r = board.getBoundingClientRect(), px = x - r.left, py = y - r.top, X = i => parseFloat(slots['t' + i].style.left);
      const topY = gap, ty = gap * 2 + ch;
      for (let i = 0; i < 7; i++) {
        const lx = X(i);
        if (px < lx - gap / 2 || px > lx + cw + gap / 2) continue;
        if (py >= topY && py <= topY + ch && i >= 3) return { pile: 'found', i: i - 3 };
        if (py >= ty - gap) return { pile: 'tab', i };
      }
      return null;
    };
    const down = (ev, id) => {
      if (over || ev.button > 0) return;
      ev.preventDefault();
      const loc = find(id); if (!loc) return;
      if (loc.pile === 'stock') { drawStock(); return; }
      const c = loc.arr[loc.idx];
      if (!c.up) return;
      if (loc.pile !== 'tab' && loc.idx !== loc.arr.length - 1) return;
      const stack = loc.arr.slice(loc.idx), nodes = stack.map(x => els[x.id]);
      const sx = ev.clientX, sy = ev.clientY; let moved = false;
      const mv = e => {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        if (!moved) { moved = true; nodes.forEach((n, i) => { n.classList.add('drag'); n.style.zIndex = 1000 + i; }); }
        nodes.forEach(n => { n.style.transform = `translate(${dx}px,${dy}px)`; });
      };
      const up = e => {
        document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
        if (!moved) { if (!smart(id)) { const n = els[id]; n.classList.remove('nope'); void n.offsetWidth; n.classList.add('nope'); } return; }
        const dx = e.clientX - sx, dy = e.clientY - sy;
        nodes.forEach(n => { n.style.transition = 'none'; n.style.left = parseFloat(n.style.left) + dx + 'px'; n.style.top = parseFloat(n.style.top) + dy + 'px'; n.style.transform = ''; n.classList.remove('drag'); });
        void board.offsetWidth; nodes.forEach(n => { n.style.transition = ''; });
        const dest = pileAt(e.clientX, e.clientY);
        const ok = dest && !(dest.pile === loc.pile && dest.i === loc.i) && (dest.pile === 'found' ? stack.length === 1 && canFound(c, dest.i) : canTab(c, dest.i));
        if (ok) doMove(loc, stack.length, dest); else render();
      };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    };
    const checkWin = () => {
      if (S.found.every(f => f.length === 13)) {
        over = true; clearInterval(timer); Snd.play('win');
        const secs = t0 ? Math.round((Date.now() - t0) / 1000) : 0;
        const bonus = secs > 30 ? Math.round(700000 / secs) : 0; score += bonus; stats();
        board.append(el('div.sol-win', {}, el('b', { text: 'Solved' }), el('span', { text: `${fmtClock(secs)} · ${moves} moves · ${score} points${bonus ? ` (time bonus ${bonus})` : ''}` }), el('button.btn.pri', { text: 'Deal Again', onclick: deal })));
        let k = 0; const cards = Object.values(els);
        const bounce = setInterval(() => { const n = cards[k++ % cards.length]; if (!n.isConnected || k > 104) { clearInterval(bounce); return; } n.classList.remove('hop'); void n.offsetWidth; n.classList.add('hop'); }, 45);
      }
    };
    const autoFinish = () => {
      finishB.hidden = true;
      const step = () => {
        if (over) return;
        for (let f = 0; f < 4; f++) {
          const need = S.found[f].length ? S.found[f][S.found[f].length - 1] : null;
          for (let t = 0; t < 7; t++) { const col = S.tab[t], c = col[col.length - 1]; if (c && canFound(c, f) && (!need || need.s === c.s)) { doMove({ pile: 'tab', i: t, arr: col, idx: col.length - 1 }, 1, { pile: 'found', i: f }); setTimeout(step, 90); return; } }
        }
        for (let t = 0; t < 7; t++) { const col = S.tab[t], c = col[col.length - 1]; if (!c) continue; for (let f = 0; f < 4; f++) if (canFound(c, f)) { doMove({ pile: 'tab', i: t, arr: col, idx: col.length - 1 }, 1, { pile: 'found', i: f }); setTimeout(step, 90); return; } }
      };
      step();
    };
    win = WM.open({
      app: 'solitaire', title: 'Solitaire', icon: 'cards', w: 820, h: 640, minW: 360, minH: 420,
      render(body, w) {
        stTime = el('b', { text: '0:00' }); stScore = el('b', { text: '0' }); stMoves = el('b', { text: '0' });
        undoB = el('button.ibtn.txt', { html: li('undo') + '<span>Undo</span>', disabled: true, onclick: () => { const h = hist.pop(); if (!h) return; const o = JSON.parse(h); S = o.S; moves = o.moves; score = o.score; undoB.disabled = !hist.length; render(); } });
        finishB = el('button.btn.pri', { text: 'Auto-finish', hidden: true, onclick: autoFinish });
        const seg = el('div.seg', {}, [1, 3].map(n => el('button' + (n === drawN ? '.on' : ''), { text: `Draw ${n}`, onclick: e => { drawN = n; $$('button', seg).forEach(b => b.classList.toggle('on', b === e.currentTarget)); deal(); } })));
        board = el('div.sol');
        slots.stock = el('div.slot.stock', { title: 'Stock' }); slots.stock.addEventListener('pointerdown', () => drawStock());
        slots.waste = el('div.slot.empty-slot');
        for (let i = 0; i < 4; i++) slots['f' + i] = el('div.slot.found', { text: 'A' });
        for (let i = 0; i < 7; i++) slots['t' + i] = el('div.slot', { text: 'K' });
        Object.values(slots).forEach(s => board.append(s));
        body.append(el('div.tbar', {}, el('button.ibtn.txt', { html: li('plus') + '<span>New Game</span>', onclick: deal }), undoB, seg, finishB, el('span.sp'),
          el('span.gstat', {}, 'Score ', stScore), el('span.gstat', {}, 'Moves ', stMoves), el('span.gstat', {}, 'Time ', stTime)), board);
        const ro = new ResizeObserver(() => { if (S) render(); }); ro.observe(board);
        w.cleanups = [() => { clearInterval(timer); ro.disconnect(); }];
        w.el.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoB.click(); } });
      }
    });
    deal();
    return win;
  }
});

/* ================= Chess (you vs. a small alpha-beta engine) ================= */
const CH = (() => {
  const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  const isW = p => p && p === p.toUpperCase();
  const side = p => !p ? null : isW(p) ? 'w' : 'b';
  const initial = () => {
    const b = Array(64).fill('');
    'rnbqkbnr'.split('').forEach((p, i) => { b[i] = p; b[56 + i] = p.toUpperCase(); b[8 + i] = 'p'; b[48 + i] = 'P'; });
    return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1 };
  };
  const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const DB = [[1, 1], [1, -1], [-1, 1], [-1, -1]], DR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const attacked = (b, sq, by) => {
    const r = sq >> 3, c = sq & 7, at = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : null;
    const pr = by === 'w' ? r + 1 : r - 1, P = by === 'w' ? 'P' : 'p';
    if (at(pr, c - 1) === P || at(pr, c + 1) === P) return true;
    const N = by === 'w' ? 'N' : 'n', K = by === 'w' ? 'K' : 'k';
    for (const [dr, dc] of KN) if (at(r + dr, c + dc) === N) return true;
    for (const [dr, dc] of KG) if (at(r + dr, c + dc) === K) return true;
    const slide = (dirs, set) => { for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (side(p) === by && set.includes(p.toLowerCase())) return true; break; } rr += dr; cc += dc; } } return false; };
    return slide(DB, 'bq') || slide(DR, 'rq');
  };
  const kingSq = (b, s) => b.indexOf(s === 'w' ? 'K' : 'k');
  const inCheck = (pos, s) => attacked(pos.b, kingSq(pos.b, s), s === 'w' ? 'b' : 'w');
  const pseudo = pos => {
    const out = [], b = pos.b, s = pos.turn, opp = s === 'w' ? 'b' : 'w';
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq]; if (!p || side(p) !== s) continue;
      const r = sq >> 3, c = sq & 7, t = p.toLowerCase();
      const add = (to, extra) => out.push(Object.assign({ from: sq, to, piece: p, cap: b[to] }, extra || {}));
      if (t === 'p') {
        const dir = s === 'w' ? -1 : 1, start = s === 'w' ? 6 : 1, last = s === 'w' ? 0 : 7, one = sq + dir * 8;
        if (!b[one]) { if ((one >> 3) === last) add(one, { promo: s === 'w' ? 'Q' : 'q' }); else { add(one); if (r === start && !b[one + dir * 8]) add(one + dir * 8, { double: true }); } }
        for (const dc of [-1, 1]) {
          const cc = c + dc; if (cc < 0 || cc > 7) continue; const to = (r + dir) * 8 + cc;
          if (b[to] && side(b[to]) === opp) { if ((to >> 3) === last) add(to, { promo: s === 'w' ? 'Q' : 'q' }); else add(to); }
          else if (to === pos.ep) add(to, { ep: true, cap: s === 'w' ? 'p' : 'P' });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of (t === 'n' ? KN : KG)) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const to = rr * 8 + cc; if (!b[to] || side(b[to]) === opp) add(to); }
        if (t === 'k') {
          const home = s === 'w' ? 60 : 4, cr = pos.castle;
          if (sq === home && !attacked(b, sq, opp)) {
            if ((s === 'w' ? cr.K : cr.k) && !b[sq + 1] && !b[sq + 2] && b[sq + 3] === (s === 'w' ? 'R' : 'r') && !attacked(b, sq + 1, opp) && !attacked(b, sq + 2, opp)) add(sq + 2, { castle: 'k' });
            if ((s === 'w' ? cr.Q : cr.q) && !b[sq - 1] && !b[sq - 2] && !b[sq - 3] && b[sq - 4] === (s === 'w' ? 'R' : 'r') && !attacked(b, sq - 1, opp) && !attacked(b, sq - 2, opp)) add(sq - 2, { castle: 'q' });
          }
        }
      } else {
        const dirs = t === 'b' ? DB : t === 'r' ? DR : DB.concat(DR);
        for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const to = rr * 8 + cc; if (b[to]) { if (side(b[to]) === opp) add(to); break; } add(to); rr += dr; cc += dc; } }
      }
    }
    return out;
  };
  const make = (pos, m) => {
    const b = pos.b.slice(), castle = Object.assign({}, pos.castle), s = pos.turn;
    b[m.to] = m.promo || m.piece; b[m.from] = '';
    if (m.ep) b[m.to + (s === 'w' ? 8 : -8)] = '';
    if (m.castle === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ''; }
    if (m.castle === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ''; }
    if (m.piece === 'K') castle.K = castle.Q = false; if (m.piece === 'k') castle.k = castle.q = false;
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(([sq, k]) => { if (m.from === sq || m.to === sq) castle[k] = false; });
    return { b, turn: s === 'w' ? 'b' : 'w', castle, ep: m.double ? (m.from + m.to) / 2 : -1 };
  };
  const legal = pos => pseudo(pos).filter(m => !inCheck(make(pos, m), pos.turn));
  const evalPos = pos => {
    let sc = 0;
    for (let i = 0; i < 64; i++) { const p = pos.b[i]; if (!p) continue; const t = p.toLowerCase(); if (isW(p)) sc += V[t] + PST[t][i]; else sc -= V[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)]; }
    return pos.turn === 'w' ? sc : -sc;
  };
  const order = ms => ms.sort((a, b) => ((b.cap ? V[b.cap.toLowerCase()] * 10 - V[b.piece.toLowerCase()] : 0) + (b.promo ? 800 : 0)) - ((a.cap ? V[a.cap.toLowerCase()] * 10 - V[a.piece.toLowerCase()] : 0) + (a.promo ? 800 : 0)));
  let nodes = 0, deadline = 0;
  const quiesce = (pos, a, bt, d) => {
    nodes++;
    const stand = evalPos(pos); if (stand >= bt) return bt; if (a < stand) a = stand; if (d <= 0) return a;
    for (const m of order(pseudo(pos).filter(x => x.cap))) { const np = make(pos, m); if (inCheck(np, pos.turn)) continue; const sc = -quiesce(np, -bt, -a, d - 1); if (sc >= bt) return bt; if (sc > a) a = sc; }
    return a;
  };
  const search = (pos, depth, a, bt, ply) => {
    if (Date.now() > deadline) throw 'time';
    nodes++;
    if (depth === 0) return quiesce(pos, a, bt, 4);
    const ms = order(legal(pos));
    if (!ms.length) return inCheck(pos, pos.turn) ? -100000 + ply : 0;
    for (const m of ms) { const sc = -search(make(pos, m), depth - 1, -bt, -a, ply + 1); if (sc >= bt) return bt; if (sc > a) a = sc; }
    return a;
  };
  const best = (pos, maxDepth, ms) => {
    deadline = Date.now() + ms; nodes = 0;
    let moves = order(legal(pos)), bestM = moves[0];
    for (let d = 1; d <= maxDepth; d++) {
      try {
        let a = -1e9, bm = null; const scored = [];
        for (const m of moves) { const sc = -search(make(pos, m), d - 1, -1e9, -a, 1); scored.push([sc, m]); if (sc > a) { a = sc; bm = m; } }
        bestM = bm; moves = scored.sort((x, y) => y[0] - x[0]).map(x => x[1]);
      } catch (e) { if (e !== 'time') throw e; break; }
    }
    return bestM;
  };
  const san = (pos, m, all) => {
    if (m.castle) return m.castle === 'k' ? 'O-O' : 'O-O-O';
    const files = 'abcdefgh', sq = i => files[i & 7] + (8 - (i >> 3)), t = m.piece.toUpperCase();
    let s = t === 'P' ? (m.cap ? files[m.from & 7] + 'x' : '') : t + (all.some(o => o.from !== m.from && o.to === m.to && o.piece === m.piece) ? files[m.from & 7] : '') + (m.cap ? 'x' : '');
    s += sq(m.to) + (m.promo ? '=Q' : '');
    const np = make(pos, m); if (inCheck(np, np.turn)) s += legal(np).length ? '+' : '#';
    return s;
  };
  return { initial, legal, make, inCheck, best, san, side };
})();

Apps.def('chess', {
  name: 'Chess', icon: 'chess', single: true,
  open() {
    const GL = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    let pos, hist, sel = -1, targets = [], last = null, thinking = false, over = false, level = 1, boardEl, statusEl, listEl, capW, capB, sanList = [];
    const LEVELS = [['Easy', 1, 200], ['Normal', 3, 900], ['Hard', 4, 2200]];
    const reset = () => { pos = CH.initial(); hist = []; sanList = []; sel = -1; targets = []; last = null; over = false; thinking = false; draw(); };
    const status = () => {
      const ms = CH.legal(pos), chk = CH.inCheck(pos, pos.turn);
      if (!ms.length) { over = true; return chk ? (pos.turn === 'w' ? 'Checkmate. LithOS wins.' : 'Checkmate. You win!') : 'Stalemate. It’s a draw.'; }
      if (thinking) return 'LithOS is thinking…';
      return (pos.turn === 'w' ? 'Your move' : 'Black to move') + (chk ? ' · check' : '');
    };
    const draw = () => {
      boardEl.innerHTML = '';
      const chkSq = CH.inCheck(pos, pos.turn) ? pos.b.indexOf(pos.turn === 'w' ? 'K' : 'k') : -1;
      for (let i = 0; i < 64; i++) {
        const r = i >> 3, c = i & 7, p = pos.b[i];
        const sq = el('div.sq' + ((r + c) % 2 ? '.dk' : '.lt') + (i === sel ? '.sel' : '') + (last && (i === last.from || i === last.to) ? '.last' : '') + (i === chkSq ? '.chk' : '') + (targets.includes(i) ? (p ? '.cap' : '.dot') : ''), { 'data-i': i });
        if (p) sq.append(el('span.pc' + (CH.side(p) === 'w' ? '.w' : '.b'), { text: GL[p.toLowerCase()] + '︎' }));
        if (c === 0) sq.append(el('span.rk', { text: 8 - r })); if (r === 7) sq.append(el('span.fl', { text: 'abcdefgh'[c] }));
        boardEl.append(sq);
      }
      statusEl.textContent = status();
      listEl.innerHTML = '';
      for (let i = 0; i < sanList.length; i += 2) listEl.append(el('div.mv', {}, el('span', { text: i / 2 + 1 + '.' }), el('b', { text: sanList[i] }), el('b', { text: sanList[i + 1] || '' })));
      listEl.scrollTop = listEl.scrollHeight;
      const count = (s) => { const all = { p: 8, n: 2, b: 2, r: 2, q: 1 }; Object.keys(all).forEach(k => { all[k] -= pos.b.filter(x => x === (s === 'w' ? k.toUpperCase() : k)).length; }); return Object.keys(all).map(k => GL[k].repeat(Math.max(0, all[k]))).join(''); };
      capW.textContent = count('b'); capB.textContent = count('w');
    };
    const play = m => {
      hist.push({ pos, last, san: sanList.slice() });
      sanList.push(CH.san(pos, m, CH.legal(pos)));
      pos = CH.make(pos, m); last = m; sel = -1; targets = [];
      sfx(m.cap ? 330 : 440, 0.06, 'triangle', 0.08);
      draw();
    };
    const ai = () => {
      if (over || pos.turn !== 'b') return;
      thinking = true; statusEl.textContent = status();
      setTimeout(() => {
        const [, d, ms] = LEVELS[level];
        let m = CH.best(pos, d, ms);
        if (level === 0 && Math.random() < 0.3) { const all = CH.legal(pos); m = all[Math.floor(Math.random() * all.length)] || m; }
        thinking = false; if (m) play(m); if (over) Snd.play(pos.turn === 'b' ? 'win' : 'error');
      }, 60);
    };
    const click = i => {
      if (over || thinking || pos.turn !== 'w') return;
      const p = pos.b[i];
      if (sel >= 0 && targets.includes(i)) { const m = CH.legal(pos).find(x => x.from === sel && x.to === i); if (m) { play(m); if (!over) ai(); else Snd.play('win'); } return; }
      if (p && CH.side(p) === 'w') { sel = i; targets = CH.legal(pos).filter(x => x.from === i).map(x => x.to); } else { sel = -1; targets = []; }
      draw();
    };
    return WM.open({
      app: 'chess', title: 'Chess', icon: 'chess', w: 780, h: 600, minW: 340, minH: 420,
      render(body, w) {
        boardEl = el('div.cboard', { role: 'grid', 'aria-label': 'Chess board' });
        let downAt = -1;
        boardEl.addEventListener('pointerdown', e => { const s = e.target.closest('.sq'); if (!s) return; downAt = +s.dataset.i; click(downAt); });
        boardEl.addEventListener('pointerup', e => { const t = document.elementFromPoint(e.clientX, e.clientY); const s = t && t.closest('.sq'); if (s && +s.dataset.i !== downAt && sel >= 0) click(+s.dataset.i); });
        statusEl = el('div.cstatus'); listEl = el('div.cmoves'); capW = el('div.ccap'); capB = el('div.ccap');
        const lv = el('div.seg', {}, LEVELS.map(([t], i) => el('button' + (i === level ? '.on' : ''), { text: t, onclick: e => { level = i; $$('button', lv).forEach(b => b.classList.toggle('on', b === e.currentTarget)); } })));
        const wrap = el('div.cwrap', {}, el('div.cboard-box', {}, boardEl),
          el('aside.cside', {}, el('div.cplayer', {}, el('span.pc.b', { text: '♚︎' }), el('div', {}, el('b', { text: 'LithOS engine' }), capB)), statusEl, listEl,
            el('div.cplayer', {}, el('span.pc.w', { text: '♚︎' }), el('div', {}, el('b', { text: 'You' }), capW))));
        body.append(el('div.tbar', {}, el('button.ibtn.txt', { html: li('plus') + '<span>New Game</span>', onclick: reset }),
          el('button.ibtn.txt', { html: li('undo') + '<span>Take Back</span>', onclick: () => { if (thinking) return; let h = hist.pop(); if (h && h.pos.turn === 'b') h = hist.pop() || h; if (h) { pos = h.pos; last = h.last; sanList = h.san; over = false; sel = -1; targets = []; draw(); } } }), el('span.sp'), lv), wrap);
        const ro = new ResizeObserver(() => { const r = wrap.getBoundingClientRect(); const side = r.width > 560 ? 220 : 0; const s = Math.max(200, Math.min(r.height - 24, r.width - side - 36)); boardEl.style.width = boardEl.style.height = s + 'px'; wrap.classList.toggle('narrow', !side); });
        ro.observe(wrap);
        w.cleanups = [() => ro.disconnect()];
        reset();
      }
    });
  }
});

/* ================= 2048 ================= */
Apps.def('2048', {
  name: '2048', icon: 'g2048', single: true,
  open() {
    let grid, score, best = Store.get('best2048', 0), won, tilesEl, scoreEl, bestEl, ov, idc = 0, stage;
    const empty = () => { const e = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) e.push([r, c]); return e; };
    const add = () => { const e = empty(); if (!e.length) return; const [r, c] = e[Math.floor(Math.random() * e.length)]; grid[r][c] = { v: Math.random() < 0.9 ? 2 : 4, id: ++idc, isNew: true }; };
    const reset = () => { grid = [...Array(4)].map(() => Array(4).fill(null)); score = 0; won = false; tilesEl.innerHTML = ''; ov.hidden = true; add(); add(); draw(); };
    const draw = () => {
      scoreEl.textContent = score; bestEl.textContent = best;
      const seen = new Set();
      grid.forEach((row, r) => row.forEach((t, c) => {
        if (!t) return; seen.add(String(t.id));
        let n = tilesEl.querySelector(`[data-id="${t.id}"]`);
        if (!n) { n = el('div.tile', { 'data-id': t.id }); tilesEl.append(n); if (t.isNew) n.classList.add('t-new'); }
        n.textContent = t.v; n.className = 'tile v' + Math.min(t.v, 4096) + (t.isNew ? ' t-new' : '') + (t.merged ? ' t-merge' : '');
        n.style.setProperty('--r', r); n.style.setProperty('--c', c);
        t.isNew = false; t.merged = false;
      }));
      $$('.tile', tilesEl).forEach(n => { if (!seen.has(n.dataset.id)) n.remove(); });
    };
    const move = dir => {
      if (!ov.hidden) return;
      let moved = false; const gone = [];
      const line = i => [0, 1, 2, 3].map(j => dir === 'left' ? [i, j] : dir === 'right' ? [i, 3 - j] : dir === 'up' ? [j, i] : [3 - j, i]);
      for (let i = 0; i < 4; i++) {
        const cells = line(i), tiles = cells.map(([r, c]) => grid[r][c]).filter(Boolean), out = [];
        for (let k = 0; k < tiles.length; k++) {
          if (k + 1 < tiles.length && tiles[k].v === tiles[k + 1].v) { const m = { v: tiles[k].v * 2, id: tiles[k].id, merged: true }; gone.push(tiles[k + 1]); score += m.v; if (m.v === 2048 && !won) won = true; out.push(m); k++; }
          else out.push(tiles[k]);
        }
        cells.forEach(([r, c], k) => { const nt = out[k] || null; if ((grid[r][c] && grid[r][c].id) !== (nt && nt.id) || (nt && nt.merged)) moved = true; grid[r][c] = nt; });
      }
      if (!moved) return;
      add(); sfx(300 + Math.min(score, 4000) / 10, 0.04, 'triangle', 0.04);
      if (score > best) { best = score; Store.set('best2048', best); }
      draw();
      if (won && !ov.dataset.won) { ov.dataset.won = '1'; showOv('You made 2048!', 'Keep going for a bigger tile.', true); }
      else if (!empty().length && !grid.some((row, r) => row.some((t, c) => (c < 3 && row[c + 1] && row[c + 1].v === t.v) || (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v)))) { showOv('Game over', `Score ${score}`, false); Snd.play('error'); }
    };
    const showOv = (t, s, cont) => { ov.hidden = false; ov.innerHTML = ''; ov.append(el('b', { text: t }), el('span', { text: s }), el('div', { style: { display: 'flex', gap: '8px' } }, cont ? el('button.btn', { text: 'Keep playing', onclick: () => { ov.hidden = true; } }) : null, el('button.btn.pri', { text: 'New game', onclick: () => { delete ov.dataset.won; reset(); } }))); };
    return WM.open({
      app: '2048', title: '2048', icon: 'g2048', w: 440, h: 580, minW: 320, minH: 460,
      render(body, w) {
        scoreEl = el('b'); bestEl = el('b');
        tilesEl = el('div.g-tiles'); ov = el('div.g-ov', { hidden: true });
        const grid = el('div.g-grid', {}, [...Array(16)].map(() => el('div.g-cell')), tilesEl, ov);
        stage = el('div.g2048', { tabindex: '0' }, el('div.g-head', {}, el('div.g-title', { text: '2048' }), el('div.g-sc', {}, el('small', { text: 'SCORE' }), scoreEl), el('div.g-sc', {}, el('small', { text: 'BEST' }), bestEl)),
          el('div.g-sub', {}, el('span', { text: 'Join the tiles, reach 2048. Arrows, WASD or swipe.' }), el('button.btn', { text: 'New game', onclick: () => { delete ov.dataset.won; reset(); } })), grid);
        body.append(stage);
        stage.addEventListener('keydown', e => {
          const d = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' }[e.key];
          if (d) { e.preventDefault(); move(d); }
        });
        let sx, sy;
        grid.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
        grid.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); });
        grid.style.touchAction = 'none';
        w.onFocus = () => stage.focus({ preventScroll: true });
        reset();
      }
    });
  }
});

/* ================= Brickfall ================= */
Apps.def('brickfall', {
  name: 'Brickfall', icon: 'bricks', single: true,
  open() {
    const W = 480, H = 600, COLS = 10, ROWS = 7, BW = 44, BH = 18, GAPX = 4, OX = (W - (COLS * BW + (COLS - 1) * GAPX)) / 2, OY = 70;
    const ROWC = ['#e2c186', '#d8a14a', '#cf8a3c', '#b8683f', '#a65b3d', '#7f6e66', '#5d6b78'];
    const LAYOUTS = [
      (r, c) => 1,
      (r, c) => (c + r) % 2 ? 1 : (r < 2 ? 2 : 0),
      (r, c) => Math.abs(c - 4.5) + r < 8 ? (r === 0 ? 3 : 1) : 0,
      (r, c) => (c === 0 || c === 9 || r === 0) ? 2 : (r % 2 && c % 3 ? 1 : 0)
    ];
    let cv, ctx, raf = 0, st = 'ready', level = 0, lives = 3, score = 0, best = Store.get('bestBrick', 0), paddle, balls, bricks, drops, keys = {}, last = 0, slowT = 0, wideT = 0, alive = true, scale = 1;
    const newLevel = () => {
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const hp = LAYOUTS[level % LAYOUTS.length](r, c); if (hp) bricks.push({ x: OX + c * (BW + GAPX), y: OY + r * (BH + 6), hp, max: hp, col: ROWC[r] }); }
      drops = []; resetBall();
    };
    const resetBall = () => { paddle = paddle || { x: W / 2, w: 84 }; balls = [{ x: paddle.x, y: H - 46, vx: 0, vy: 0, stuck: true }]; };
    const launch = () => { balls.forEach(b => { if (b.stuck) { b.stuck = false; const sp = 330 + level * 25; const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; } }); };
    const newGame = () => { level = 0; lives = 3; score = 0; paddle = { x: W / 2, w: 84 }; newLevel(); st = 'ready'; };
    const step = t => {
      if (!alive) return;
      const dt = Math.min(0.033, (t - (last || t)) / 1000); last = t;
      if (st === 'play') update(dt);
      draw(); raf = requestAnimationFrame(step);
    };
    const update = dt => {
      const pw = wideT > 0 ? 130 : 84; paddle.w += (pw - paddle.w) * Math.min(1, dt * 8);
      wideT -= dt; slowT -= dt;
      const kv = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
      if (kv) paddle.x += kv * 520 * dt;
      paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
      const sm = slowT > 0 ? 0.65 : 1;
      balls.forEach(b => {
        if (b.stuck) { b.x = paddle.x; b.y = H - 46; return; }
        const n = Math.ceil(Math.hypot(b.vx, b.vy) * dt * sm / 5);
        for (let i = 0; i < n; i++) {
          b.x += b.vx * dt * sm / n; b.y += b.vy * dt * sm / n;
          if (b.x < 7) { b.x = 7; b.vx = Math.abs(b.vx); sfx(880, 0.02); } if (b.x > W - 7) { b.x = W - 7; b.vx = -Math.abs(b.vx); sfx(880, 0.02); }
          if (b.y < 7) { b.y = 7; b.vy = Math.abs(b.vy); sfx(880, 0.02); }
          if (b.vy > 0 && b.y > H - 44 && b.y < H - 30 && Math.abs(b.x - paddle.x) < paddle.w / 2 + 6) {
            const off = (b.x - paddle.x) / (paddle.w / 2), sp = Math.min(640, Math.hypot(b.vx, b.vy) * 1.015), a = -Math.PI / 2 + off * 1.05;
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.y = H - 45; sfx(440, 0.04, 'triangle', 0.06);
          }
          for (const k of bricks) {
            if (k.hp <= 0) continue;
            if (b.x + 6 > k.x && b.x - 6 < k.x + BW && b.y + 6 > k.y && b.y - 6 < k.y + BH) {
              const ox = Math.min(b.x + 6 - k.x, k.x + BW - (b.x - 6)), oy = Math.min(b.y + 6 - k.y, k.y + BH - (b.y - 6));
              if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
              k.hp--; score += 10 * k.max; sfx(k.hp ? 520 : 660 + Math.random() * 200, 0.05);
              if (!k.hp && Math.random() < 0.14) drops.push({ x: k.x + BW / 2, y: k.y, t: 'WMSL'[Math.floor(Math.random() * 4)] });
              break;
            }
          }
        }
      });
      balls = balls.filter(b => b.y < H + 20);
      drops.forEach(d => { d.y += 150 * dt; if (d.y > H - 46 && d.y < H - 26 && Math.abs(d.x - paddle.x) < paddle.w / 2 + 10) { d.got = true; sfx(990, 0.1, 'sine', 0.08);
        if (d.t === 'W') wideT = 12; if (d.t === 'S') slowT = 10; if (d.t === 'L') lives++; if (d.t === 'M') { const b0 = balls[0]; if (b0) [0.5, -0.5].forEach(a => { const sp = Math.hypot(b0.vx, b0.vy) || 360, ang = Math.atan2(b0.vy, b0.vx) + a; balls.push({ x: b0.x, y: b0.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp }); }); } } });
      drops = drops.filter(d => !d.got && d.y < H + 20);
      if (!balls.length) { lives--; Snd.play('error'); if (lives <= 0) { st = 'over'; if (score > best) { best = score; Store.set('bestBrick', best); } } else { resetBall(); st = 'ready'; } }
      if (bricks.every(k => k.hp <= 0)) { level++; score += 500; Snd.play('win'); newLevel(); st = 'ready'; }
    };
    const draw = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#141722'); bg.addColorStop(1, '#0b0c12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < H; y += 24) ctx.fillRect(0, y, W, 1);
      bricks.forEach(k => { if (k.hp <= 0) return; ctx.globalAlpha = 0.45 + 0.55 * (k.hp / k.max); ctx.fillStyle = k.col; rrect(ctx, k.x, k.y, BW, BH, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(k.x + 2, k.y + 2, BW - 4, 3); if (k.max > 1) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(k.x + 4, k.y + BH - 5, (BW - 8) * k.hp / k.max, 2); } ctx.globalAlpha = 1; });
      drops.forEach(d => { ctx.fillStyle = { W: '#4a95dc', M: '#b7a1f2', S: '#77c97a', L: '#e0584d' }[d.t]; rrect(ctx, d.x - 14, d.y - 8, 28, 16, 8); ctx.fill(); ctx.fillStyle = '#0b0c12'; ctx.font = '700 11px "Red Hat Text",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.t, d.x, d.y + 1); });
      ctx.fillStyle = '#eaa53e'; rrect(ctx, paddle.x - paddle.w / 2, H - 40, paddle.w, 10, 5); ctx.fill();
      balls.forEach(b => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, 7); ctx.fill(); });
      ctx.fillStyle = 'rgba(240,234,227,.85)'; ctx.font = '600 14px "JetBrains Mono",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`SCORE ${score}`, 14, 24); ctx.textAlign = 'center'; ctx.fillText(`LEVEL ${level + 1}`, W / 2, 24); ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 14, 24);
      const center = (a, b) => { ctx.fillStyle = 'rgba(11,12,18,.6)'; ctx.fillRect(0, H / 2 - 50, W, 100); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 26px "Red Hat Display",sans-serif'; ctx.fillText(a, W / 2, H / 2 - 12); ctx.font = '500 14px "Red Hat Text",sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(b, W / 2, H / 2 + 18); };
      if (st === 'ready') center(level ? `Level ${level + 1}` : 'Brickfall', 'Click or press Space to launch');
      if (st === 'paused') center('Paused', 'Press Space to continue');
      if (st === 'over') center(`Game over · ${score}`, `Best ${best} · click to play again`);
    };
    const act = () => { if (st === 'over') { newGame(); return; } if (st === 'ready') { st = 'play'; launch(); } else if (st === 'paused') st = 'play'; };
    return WM.open({
      app: 'brickfall', title: 'Brickfall', icon: 'bricks', w: 520, h: 700, minW: 300, minH: 400,
      render(body, w) {
        cv = el('canvas.bf-cv', { width: String(W), height: String(H), 'aria-label': 'Brickfall' });
        ctx = cv.getContext('2d');
        const stage = el('div.bf', { tabindex: '0' }, cv);
        body.append(stage);
        const fit = () => { const s = Math.min(stage.clientWidth / W, stage.clientHeight / H); scale = s; cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; };
        const ro = new ResizeObserver(fit); ro.observe(stage);
        cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); paddle.x = clamp((e.clientX - r.left) / scale, paddle.w / 2, W - paddle.w / 2); });
        cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); paddle.x = clamp((e.clientX - r.left) / scale, paddle.w / 2, W - paddle.w / 2); act(); });
        cv.style.touchAction = 'none';
        stage.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ') { e.preventDefault(); if (st === 'play') st = 'paused'; else act(); } if (e.key.startsWith('Arrow')) e.preventDefault(); });
        stage.addEventListener('keyup', e => { keys[e.key] = false; });
        stage.addEventListener('blur', () => { keys = {}; if (st === 'play') st = 'paused'; });
        w.onFocus = () => stage.focus({ preventScroll: true });
        w.onVis = v => { if (!v && st === 'play') st = 'paused'; };
        w.cleanups = [() => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); }];
        newGame(); fit(); raf = requestAnimationFrame(step);
      }
    });
  }
});
