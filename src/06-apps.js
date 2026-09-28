/* ================= Text Editor ================= */
let untitledN = 0;
Apps.def('editor', {
  name: 'Text Editor', icon: 'editor',
  keyOf: a => a.path || null,
  reuse(w, a) { if (a.edit && w.setMode) w.setMode('edit'); },
  open(args) {
    const st = { path: args.path || null, dirty: false, wrap: false, untitled: args.path ? null : `Untitled Document ${++untitledN}` };
    const node = st.path ? FS.get(st.path) : null;
    const isMd = () => !!st.path && extOf(st.path) === 'md';
    st.mode = isMd() && !args.edit ? 'preview' : 'edit';
    const name = () => st.path ? FS.base(st.path) : st.untitled;
    let ta, gut, prev, pos, state, seg, wrapB, win;
    const title = () => WM.setTitle(win, `${st.dirty ? '• ' : ''}${name()} — Text Editor`);
    const lines = () => { const n = ta.value.split('\n').length; if (gut._n !== n) { gut._n = n; gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); } gut.scrollTop = ta.scrollTop; };
    const caret = () => { const v = ta.value.slice(0, ta.selectionStart), l = v.split('\n'); pos.textContent = `Ln ${l.length}, Col ${l[l.length - 1].length + 1}`; };
    const setDirty = d => { st.dirty = d; state.textContent = d ? 'Modified' : 'Saved'; title(); };
    const setMode = m => {
      st.mode = m;
      if (seg) $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.m === m));
      if (m === 'preview') { prev.firstChild.innerHTML = renderMd(ta.value); prev.hidden = false; edBox.hidden = true; }
      else { prev.hidden = true; edBox.hidden = false; setTimeout(() => ta.focus({ preventScroll: true }), 30); lines(); }
      wrapB.hidden = m === 'preview';
    };
    const save = async () => {
      if (!st.path) {
        const nm = await Dialog.prompt({ title: 'Save As', label: 'File name (saved to ~/Documents)', value: 'Untitled Document.txt', ok: 'Save', stem: true });
        if (!nm) return false;
        const p = HOME + '/Documents/' + nm;
        if (FS.get(p) && !(await Dialog.confirm({ title: `Replace “${nm}”?`, text: 'A file with that name already exists in Documents.', ok: 'Replace', danger: true }))) return false;
        st.path = p; win.key = p;
        if (isMd() && !seg) buildSeg();
      }
      const n = FS.get(st.path);
      if (n && (n.kind || n.bin)) { Dialog.alert('Can’t save', 'This file is read-only.'); return false; }
      if (!FS.write(st.path, ta.value)) { Dialog.alert('Can’t save', `The folder for “${name()}” no longer exists.`); return false; }
      setDirty(false);
      return true;
    };
    let edBox, tbar;
    const buildSeg = () => {
      seg = el('div.seg', { role: 'tablist' }, el('button', { 'data-m': 'edit', text: 'Edit', onclick: () => setMode('edit') }), el('button', { 'data-m': 'preview', text: 'Preview', onclick: () => setMode('preview') }));
      tbar.insertBefore(seg, tbar.children[2]);
    };
    win = WM.open({
      app: 'editor', title: name() + ' — Text Editor', icon: 'editor', w: 780, h: 580, minW: 340, minH: 240, key: st.path,
      render(body, w) {
        ta = el('textarea.ed-ta', { spellcheck: 'false', 'aria-label': 'Document text', wrap: 'off' });
        ta.value = node ? String(node.content || '') : '';
        gut = el('div.ed-gut', { 'aria-hidden': 'true' });
        edBox = el('div.ed', {}, gut, ta);
        prev = el('div.md', {}, el('div.md-in'));
        wireLinks(prev);
        pos = el('span', { text: 'Ln 1, Col 1' }); state = el('span', { text: 'Saved' });
        wrapB = ibtn('wrap', 'Wrap lines', () => { st.wrap = !st.wrap; ta.classList.toggle('wrap', st.wrap); ta.setAttribute('wrap', st.wrap ? 'soft' : 'off'); wrapB.classList.toggle('on', st.wrap); gut.hidden = st.wrap; });
        tbar = el('div.tbar', {}, el('button.ibtn.txt', { html: li('save') + '<span>Save</span>', title: 'Save (Ctrl+S)', onclick: () => save() }), el('span.vsep'), el('span.sp'), wrapB);
        if (isMd()) buildSeg();
        body.append(tbar, edBox, prev, el('div.statusbar', {}, pos, el('span', { text: isMd() ? 'Markdown' : 'Plain Text' }), el('span', { text: 'UTF-8' }), el('span.sp'), state));
        ta.addEventListener('input', () => { if (!st.dirty) setDirty(true); lines(); caret(); });
        ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
        ['keyup', 'click'].forEach(ev => ta.addEventListener(ev, caret));
        ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } });
        w.el.addEventListener('keydown', e => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e' && isMd()) { e.preventDefault(); setMode(st.mode === 'edit' ? 'preview' : 'edit'); }
        });
        w.setMode = setMode;
        w.beforeClose = () => {
          if (!st.dirty) return true;
          Dialog.open({ title: `Save changes to “${name()}” before closing?`, text: 'If you don’t save, your changes will be lost.', buttons: [{ label: 'Close Without Saving', kind: 'dan', value: 'discard' }, { label: 'Cancel', value: 'cancel', cancel: true }, { label: 'Save', kind: 'pri', value: 'save', def: true }] })
            .then(async r => { if (r === 'discard') WM.close(w, true); else if (r === 'save' && await save()) WM.close(w, true); });
          return false;
        };
        w.onFocus = () => { if (st.mode === 'edit' && !w.el.contains(document.activeElement)) ta.focus({ preventScroll: true }); };
        w.cleanups = [Bus.on('renamed', (from, to) => { if (from === st.path) { st.path = to; w.key = to; title(); } })];
        setMode(st.mode); lines();
      }
    });
    return win;
  }
});

/* ================= Document Viewer (résumé) ================= */
function resumePages() {
  const job = e => `<div class="rs-job"><div class="top">${esc(e.role)} · ${esc(e.company)}<span>${esc(e.dates)}</span></div><ul>${[e.summary].concat(e.company === 'struMLines' ? ['Automations built so nobody has to think about them again; some still run unattended.'] : e.bullets.slice(0, 1).concat(['Redux Toolkit and Saga for routing and state; performance work on redundant API calls.', 'API integrations for AI services, Stripe and email.'])).map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>`;
  const proj = p => `<div class="rs-proj"><b>${esc(p.name)}</b> <span class="rs-st">· ${esc(p.role)} · ${esc(p.stack.join(', '))}</span><p>${esc(p.blurb)} ${esc(p.key.slice(0, 2).join(' '))}</p></div>`;
  const head = `<h1 class="rs-name">NAJI ULLAH</h1><div class="rs-role">Full-stack Software Engineer · Lahore, Pakistan</div>
    <div class="rs-contact"><span>${esc(ME.email)}</span><span>github.com/Naji-Ullah</span><span>linkedin.com/in/naji-ullah-53222624b</span><span>naji.codes</span></div>`;
  const p1 = `${head}
    <div class="rs-h">Profile</div><p style="margin:0">Full-stack software engineer working with React, Next.js, Django and Firebase. Seven shipped projects across fintech, health, AI, data and operations, from school software and medical SaaS to Salesforce integrations and 3D model generation. Ships by day, studies by night.</p>
    <div class="rs-h">Experience</div>${EXPERIENCE.map(job).join('')}
    <div class="rs-h">Selected Projects</div>${PROJECTS.slice(0, 4).map(proj).join('')}
    <div class="rs-foot"><span>Naji Ullah · Résumé</span><span>1 / 2</span></div>`;
  const p2 = `${PROJECTS.slice(4).map(proj).join('')}
    <div class="rs-h">Skills</div><dl class="rs-skills">${SKILLS.map(s => `<dt>${esc(s.group)}</dt><dd>${esc(s.main.map(m => m[0]).concat(s.also).join(', '))}</dd>`).join('')}</dl>
    <div class="rs-h">Education</div><div class="rs-job"><div class="top">BS Software Engineering · COMSATS University, Lahore<span>2024 – present</span></div><ul><li>Studying it by night, applying it by deadline.</li></ul></div>
    <div class="rs-h">Status</div><p style="margin:0">Available for interesting work. Based in Lahore (UTC+5), comfortable with remote teams.</p>
    <div class="rs-foot"><span>Naji Ullah · Résumé</span><span>2 / 2</span></div>`;
  return [p1, p2];
}
Apps.def('pdf', {
  name: 'Document Viewer', icon: 'pdf',
  keyOf: a => a.path || HOME + '/Desktop/Resume.pdf',
  open(args) {
    const path = args.path || HOME + '/Desktop/Resume.pdf', node = FS.get(path);
    let zoom = 1, fit = true, view, sizers = [], zl, pg;
    const layout = () => {
      if (!view) return;
      if (fit) zoom = clamp((view.clientWidth - 40) / 794, 0.25, 2);
      sizers.forEach(s => { s.style.width = 794 * zoom + 'px'; s.style.height = 1123 * zoom + 'px'; s.firstChild.style.transform = `scale(${zoom})`; });
      zl.textContent = Math.round(zoom * 100) + '%';
      fitB.classList.toggle('on', fit);
    };
    const setZoom = z => { fit = false; zoom = clamp(z, 0.25, 3); layout(); };
    let fitB;
    return WM.open({
      app: 'pdf', title: FS.base(path) + ' — Document Viewer', icon: 'pdf', w: 860, h: Math.min(760, window.innerHeight - 80), minW: 340, minH: 260, key: path,
      render(body, w) {
        zl = el('button.ibtn.txt', { text: '100%', title: 'Fit width', style: { minWidth: '56px' }, onclick: () => { fit = true; layout(); } });
        fitB = ibtn('fit', 'Fit width', () => { fit = true; layout(); });
        pg = el('span', { text: '1 of 2', style: { fontSize: '13px', color: 'var(--text-dim)', padding: '0 8px', fontVariantNumeric: 'tabular-nums' } });
        view = el('div.pdf-view');
        body.append(el('div.tbar', {}, pg, el('span.sp'), ibtn('zout', 'Zoom out', () => setZoom(zoom - 0.1)), zl, ibtn('zin', 'Zoom in', () => setZoom(zoom + 0.1)), fitB), view);
        if (!node || node.kind !== 'resume') { view.append(el('div.empty', { style: { color: '#ddd' } }, el('span', { html: li('warn') }), 'This document can’t be displayed.')); return; }
        resumePages().forEach(html => { const s = el('div.pdf-sizer', {}, el('div.pdf-page', { html })); sizers.push(s); view.append(s); });
        view.addEventListener('scroll', () => { const i = sizers.findIndex(s => s.offsetTop + s.offsetHeight / 2 > view.scrollTop + 20); pg.textContent = `${Math.max(1, i + 1)} of ${sizers.length}`; });
        view.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9)); } }, { passive: false });
        const ro = new ResizeObserver(() => layout()); ro.observe(view);
        w.cleanups = [() => ro.disconnect()];
        layout();
      }
    });
  }
});

/* ================= Image Viewer ================= */
Apps.def('images', {
  name: 'Image Viewer', icon: 'images', single: true,
  reuse(w, a) { if (a.path && w.show) w.show(a.path); },
  open(args) {
    let cur = args.path || HOME + '/Pictures/Wallpapers/strata-night.png', zoom = 0, stage, img, zl;
    const sibs = () => { const d = FS.get(FS.dir(cur)); return d ? FS.list(d, false).filter(n => n.kind === 'img').map(n => FS.path(n)) : [cur]; };
    const win = WM.open({
      app: 'images', title: 'Image Viewer', icon: 'images', w: 900, h: 620, minW: 340, minH: 260,
      render(body, w) {
        img = el('img', { alt: '' });
        stage = el('div.iv.fit', {}, img);
        zl = el('span', { style: { fontSize: '12.5px', color: 'var(--text-dim)', minWidth: '44px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' } });
        const step = d => { const s = sibs(); const i = s.indexOf(cur); w.show(s[(i + d + s.length) % s.length]); };
        const apply = () => { stage.classList.toggle('fit', !zoom); img.style.width = zoom ? 1600 * zoom + 'px' : ''; zl.textContent = zoom ? Math.round(zoom * 100) + '%' : 'Fit'; };
        body.append(el('div.tbar', {}, ibtn('back', 'Previous image', () => step(-1)), ibtn('fwd', 'Next image', () => step(1)), el('span.sp'),
          ibtn('zout', 'Zoom out', () => { zoom = clamp((zoom || img.clientWidth / 1600) - 0.1, 0.1, 3); apply(); }), zl,
          ibtn('zin', 'Zoom in', () => { zoom = clamp((zoom || img.clientWidth / 1600) + 0.1, 0.1, 3); apply(); }), ibtn('fit', 'Best fit', () => { zoom = 0; apply(); }),
          el('span.vsep'), el('button.btn', { html: li('desktop') + '<span>Set as Background</span>', onclick: () => { const n = FS.get(cur); if (n && n.wall) { Wall.set(n.wall); Notif.push({ title: 'Background changed', body: FS.base(cur), icon: 'images', quiet: true, timeout: 2500 }); } } })),
          stage, el('div.statusbar', {}, el('span.nm'), el('span', { text: '1600 × 1000 pixels' }), el('span.sp'), el('span.sz')));
        w.el.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
        w.show = p => {
          const n = FS.get(p); if (!n || !n.wall) return;
          cur = p; img.src = Wall.url(n.wall, 1600, 1000); img.alt = `${WALLS[n.wall].name} wallpaper`;
          WM.setTitle(w, FS.base(p) + ' — Image Viewer'); $('.nm', w.body).textContent = FS.base(p); $('.sz', w.body).textContent = fmtSize(FS.size(n));
          zoom = 0; apply();
        };
        setTimeout(() => w.show(cur), 10);
      }
    });
    return win;
  }
});

/* ================= System Monitor (skills as processes) ================= */
Apps.def('monitor', {
  name: 'System Monitor', icon: 'monitor', single: true,
  reuse(w, a) { if (a.tab && w.tab) w.tab(a.tab); },
  open(args) {
    const R = mulberry(77);
    const procs = PROCS.map(([pn, label, group, tok]) => { const used = usedIn(tok); return { pn, label, group, used, pid: 1100 + Math.floor(R() * 8800), base: used.length ? used.length / 7 * 24 + 2 : 0.2 + R() * 0.8, mem: used.length ? 60 + used.length * 90 + Math.floor(R() * 60) : 8 + Math.floor(R() * 30), cpu: 0, alive: true }; });
    let sort = { k: 'cpu', d: -1 }, selP = null, filter = '', tabName = args.tab || 'processes', timer, tbody, detail, content, tabs, hist = { a: [], b: [] }, canvas, tip;
    const jitter = () => procs.forEach(p => { p.cpu = p.alive ? Math.max(0, p.base * (0.75 + Math.random() * 0.5)) : 0; });
    const groupColor = g => ({ Frontend: 'var(--c1)', Backend: 'var(--c2)', 'On the bench': 'var(--text-dim)', Integrations: 'var(--line)' })[g];
    const rows = () => {
      const q = filter.toLowerCase();
      return procs.filter(p => p.alive && (!q || p.pn.includes(q) || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)))
        .sort((a, b) => { const k = sort.k, va = k === 'used' ? a.used.length : a[k], vb = k === 'used' ? b.used.length : b[k]; return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * sort.d; });
    };
    const showDetail = () => {
      detail.innerHTML = '';
      const p = procs.find(x => x.pn === selP && x.alive);
      if (!p) { detail.append(el('div.grow', {}, el('small', { text: `${procs.filter(x => x.alive).length} processes · skills from the portfolio lab assay. Select one to see where it ran.` }))); return; }
      detail.append(el('div.grow', {}, el('b', { text: `${p.pn} · ${p.label}` }),
        el('small', { text: p.used.length ? `Used in ${p.used.length} of 7 projects: ${p.used.map(u => u.name).join(', ')}` : `${p.group}. Also on hand, ready when a project needs it.` })),
        p.used.length ? el('button.btn', { text: 'Open Projects', onclick: () => Apps.launch('files', { path: HOME + '/Projects' }) }) : null,
        el('button.btn', { text: 'End Process', onclick: () => endProc(p) }));
    };
    const endProc = p => {
      p.alive = false; if (selP === p.pn) selP = null; drawTable(); showDetail();
      setTimeout(() => { p.alive = true; drawTable(); showDetail(); Notif.push({ title: `${p.pn}.service restarted`, body: `systemd brought ${p.label} back up (Restart=always). ${p.used.length ? `${p.used.length} projects depend on it.` : 'It stays on hand.'}`, icon: 'monitor' }); }, 2200);
    };
    const drawTable = () => {
      if (!tbody) return;
      tbody.innerHTML = '';
      rows().forEach(p => {
        const tr = el('tr' + (p.pn === selP ? '.sel' : ''), { 'data-pn': p.pn },
          el('td', {}, el('div.pn', {}, el('span.dotc', { style: { background: groupColor(p.group) } }), el('span', { text: p.pn }))),
          el('td.dim', { text: p.group }), el('td.dim', { text: 'naji' }),
          el('td.num', {}, el('div.cpu-cell', {}, el('span.cpu', { text: p.cpu.toFixed(1) }), el('span.meter', {}, el('i', { style: { width: Math.min(100, p.cpu * 3) + '%' } })))),
          el('td.num.dim', { text: p.pid }), el('td.num.dim', { text: p.mem + ' MiB' }), el('td.num', { text: p.used.length ? `${p.used.length} / 7` : 'on hand' }));
        tr.addEventListener('click', () => { selP = p.pn; $$('tr', tbody).forEach(r => r.classList.toggle('sel', r === tr)); showDetail(); });
        onCtx(tr, e => { selP = p.pn; $$('tr', tbody).forEach(r => r.classList.toggle('sel', r === tr)); showDetail(); Menu.show(e.clientX, e.clientY, [{ label: 'End Process', icon: 'close', kbd: 'Delete', action: () => endProc(p) }, { label: 'Kill Process', icon: 'warn', action: () => endProc(p) }, { sep: true }, { label: 'Properties', icon: 'info', action: () => Dialog.open({ title: p.pn, text: `${p.label} · ${p.group} · PID ${p.pid} · ${p.mem} MiB`, buttons: [{ label: 'Close', kind: 'pri', value: 1, def: true, cancel: true }] }) }]); });
        tbody.append(tr);
      });
    };
    const updateCpu = () => { if (!tbody) return; $$('tr', tbody).forEach(tr => { const p = procs.find(x => x.pn === tr.dataset.pn); if (!p) return; $('.cpu', tr).textContent = p.cpu.toFixed(1); $('.meter i', tr).style.width = Math.min(100, p.cpu * 3) + '%'; }); };
    const processesView = () => {
      const cols = [['pn', 'Process Name'], ['group', 'Group'], [null, 'User'], ['cpu', '% CPU', 1], ['pid', 'ID', 1], ['mem', 'Memory', 1], ['used', 'Projects', 1]];
      const thr = el('tr', {}, cols.map(([k, t, num]) => { const th = el('th' + (num ? '.num' : ''), { html: esc(t) + (sort.k === k ? ` <span class="ar">${sort.d < 0 ? '▾' : '▴'}</span>` : '') }); if (k) th.addEventListener('click', () => { sort = { k, d: sort.k === k ? -sort.d : (typeof procs[0][k] === 'string' ? 1 : -1) }; content.replaceChildren(processesView()); drawTable(); }); return th; }));
      tbody = el('tbody');
      return el('div', { style: { flex: '1', minHeight: '0', overflow: 'auto' } }, el('table.ptable', {}, el('thead', {}, thr), tbody));
    };
    const drawChart = () => {
      if (!canvas || !canvas.isConnected) return;
      const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const padL = 34, padB = 18, pw = W - padL - 8, ph = H - padB - 6;
      c.font = '11px "Red Hat Text", sans-serif'; c.fillStyle = cssVar('--text-faint'); c.strokeStyle = cssVar('--line-soft'); c.lineWidth = 1;
      [0, 25, 50, 75, 100].forEach(v => { const y = 6 + ph - v / 100 * ph; c.beginPath(); c.moveTo(padL, Math.round(y) + 0.5); c.lineTo(W - 8, Math.round(y) + 0.5); c.stroke(); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(v + '%', padL - 6, y); });
      c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('60 s', padL, H - 3); c.textAlign = 'right'; c.fillText('now', W - 8, H - 3);
      [['a', '--c1'], ['b', '--c2']].forEach(([k, col]) => {
        const h = hist[k]; if (h.length < 2) return;
        c.strokeStyle = cssVar(col); c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath();
        h.forEach((v, i) => { const x = padL + pw - (h.length - 1 - i) * (pw / 59), y = 6 + ph - v / 100 * ph; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
        c.stroke();
        const lx = padL + pw, ly = 6 + ph - h[h.length - 1] / 100 * ph;
        c.fillStyle = cssVar('--surface'); c.beginPath(); c.arc(lx, ly, 5, 0, 7); c.fill(); c.fillStyle = cssVar(col); c.beginPath(); c.arc(lx, ly, 3.5, 0, 7); c.fill();
      });
      if (canvas._hover != null) { const x = canvas._hover; c.strokeStyle = cssVar('--text-faint'); c.lineWidth = 1; c.beginPath(); c.moveTo(x + 0.5, 6); c.lineTo(x + 0.5, 6 + ph); c.stroke(); }
    };
    const resourcesView = () => {
      canvas = el('canvas', { role: 'img', 'aria-label': 'CPU history for the day-shift and night-shift threads over the last 60 seconds' });
      tip = el('div.ctip');
      const wrap = el('div.chart-wrap', {}, canvas, tip);
      canvas.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect(), padL = 34, pw = r.width - padL - 8, x = e.clientX - r.left;
        const n = hist.a.length; if (!n || x < padL) { tip.style.display = 'none'; canvas._hover = null; drawChart(); return; }
        const i = clamp(Math.round(n - 1 - (padL + pw - x) / (pw / 59)), 0, n - 1), ago = n - 1 - i;
        canvas._hover = padL + pw - ago * (pw / 59);
        tip.innerHTML = `<div style="color:var(--text-dim)">${ago ? ago + ' s ago' : 'now'}</div><div><i style="display:inline-block;width:10px;height:3px;background:var(--c1);vertical-align:middle;margin-right:6px"></i>Day shift <b>${hist.a[i].toFixed(1)}%</b></div><div><i style="display:inline-block;width:10px;height:3px;background:var(--c2);vertical-align:middle;margin-right:6px"></i>Night shift <b>${hist.b[i].toFixed(1)}%</b></div>`;
        tip.style.display = 'block'; tip.style.left = Math.min(canvas._hover + 10, r.width - 150) + 'px'; tip.style.top = '8px'; drawChart();
      });
      canvas.addEventListener('pointerleave', () => { tip.style.display = 'none'; canvas._hover = null; drawChart(); });
      const mem = el('b'), net = el('b'), up = el('b');
      const v = el('div.res', {},
        el('div', {}, el('h4', {}, 'CPU', el('small', { text: 'Naji Ullah · 2 threads' })), wrap,
          el('div.legend', {}, el('span', {}, el('i', { style: { background: 'var(--c1)' } }), 'Day shift (ships)'), el('span', {}, el('i', { style: { background: 'var(--c2)' } }), 'Night shift (studies)'))),
        el('div', {}, el('h4', {}, 'Memory', el('small', { text: '11.2 GiB of 16 GiB · 7 projects cached' })), el('div.bigbar', {}, el('i', { style: { width: '70%' } }))),
        el('div.kv', {}, el('div', {}, el('small', { text: 'Network' }), net), el('div', {}, el('small', { text: 'Uptime' }), up), el('div', {}, el('small', { text: 'Coffee' }), mem)));
      v._tick = () => { net.textContent = `↓ ${(40 + Math.random() * 90).toFixed(0)} KiB/s  ↑ ${(6 + Math.random() * 14).toFixed(0)} KiB/s`; up.textContent = uptimeStr(); mem.textContent = new Date().getHours() >= 18 || new Date().getHours() < 5 ? 'Night reserve' : 'Nominal'; };
      v._tick();
      return v;
    };
    const fsView = () => {
      const rowsFs = [['/dev/nvme0n1p2', '/', 'ext4', '512.1 GB', '318.4 GB', 38], ['/dev/nvme0n1p1', '/boot/efi', 'vfat', '1.1 GB', '1.0 GB', 6], ['/dev/nvme0n1p3', '/home/naji/Projects', 'ext4', '64.0 GB', '41.7 GB', 35]];
      return el('div', { style: { overflow: 'auto', flex: '1' } }, el('table.ptable', {},
        el('thead', {}, el('tr', {}, ['Device', 'Directory', 'Type', 'Total', 'Available', 'Used'].map((t, i) => el('th' + (i > 2 ? '.num' : ''), { text: t })))),
        el('tbody', {}, rowsFs.map(r => el('tr', {}, el('td', { text: r[0] }), el('td.dim', { text: r[1] }), el('td.dim', { text: r[2] }), el('td.num', { text: r[3] }), el('td.num', { text: r[4] }),
          el('td.num', {}, el('div.cpu-cell', {}, el('span', { text: r[5] + '%' }), el('span.meter', {}, el('i', { style: { width: r[5] + '%' } })))))))));
    };
    const win = WM.open({
      app: 'monitor', title: 'System Monitor', icon: 'monitor', w: 820, h: 560, minW: 360, minH: 280,
      render(body, w) {
        const search = el('input.inp', { placeholder: 'Filter processes', 'aria-label': 'Filter processes', style: { width: '200px', height: '30px' } });
        search.addEventListener('input', () => { filter = search.value; drawTable(); });
        tabs = el('div.tabs', { role: 'tablist' }, [['processes', 'Processes'], ['resources', 'Resources'], ['fs', 'File Systems']].map(([k, t]) => el('button.tab', { 'data-t': k, role: 'tab', text: t, onclick: () => w.tab(k) })), el('span', { style: { flex: '1' } }), el('div', { style: { padding: '5px 0' } }, search));
        content = el('div', { style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column', overflow: 'auto' } });
        detail = el('div.pdetail');
        body.append(tabs, content, detail);
        w.tab = k => {
          tabName = k; canvas = null; tbody = null;
          $$('.tab', tabs).forEach(b => b.classList.toggle('on', b.dataset.t === k));
          search.parentNode.hidden = k !== 'processes'; detail.hidden = k !== 'processes';
          content.replaceChildren(k === 'processes' ? processesView() : k === 'resources' ? resourcesView() : fsView());
          if (k === 'processes') { drawTable(); showDetail(); }
          if (k === 'resources') requestAnimationFrame(drawChart);
        };
        { const hr0 = new Date().getHours(), day0 = hr0 >= 8 && hr0 < 19; for (let i = 0; i < 60; i++) { hist.a.push(clamp((day0 ? 48 : 20) + Math.sin(i / 5) * 9 + Math.random() * 12, 2, 98)); hist.b.push(clamp((day0 ? 16 : 50) + Math.cos(i / 7) * 8 + Math.random() * 12, 2, 98)); } }
        jitter(); w.tab(tabName);
        timer = setInterval(() => {
          jitter(); if (tabName === 'processes') updateCpu();
          const hr = new Date().getHours(), day = hr >= 8 && hr < 19;
          hist.a.push(clamp((day ? 52 : 22) + Math.random() * 26 - 8, 2, 98)); hist.b.push(clamp((day ? 18 : 55) + Math.random() * 24 - 8, 2, 98));
          if (hist.a.length > 60) { hist.a.shift(); hist.b.shift(); }
          if (tabName === 'resources') { drawChart(); const r = content.firstChild; if (r && r._tick) r._tick(); }
        }, 1000);
        w.cleanups = [() => clearInterval(timer), Bus.on('theme', () => drawChart()), Bus.on('accent', () => drawChart())];
        w.onResize = () => drawChart();
      }
    });
    return win;
  }
});

/* ================= Settings ================= */
Apps.def('settings', {
  name: 'Settings', icon: 'settings', single: true,
  reuse(w, a) { if (a.page && w.page) w.page(a.page); },
  open(args) {
    let main, side, cur = args.page || 'appearance';
    const pages = [['appearance', 'Appearance', 'palette'], ['background', 'Background', 'image'], ['sound', 'Sound', 'vol'], ['about', 'About', 'info']];
    const row = (label, sub, ctrl) => el('div.st-row', {}, el('div', {}, el('div', { text: label }), sub ? el('small', { text: sub }) : null), ctrl);
    const P = {
      appearance() {
        const modes = [['auto', 'Automatic', 'Follows your device', ['#1f1c1a', '#f2efeb']], ['night', 'Night shift', 'Dark', ['#1f1c1a', '#1f1c1a']], ['day', 'Day shift', 'Light', ['#f2efeb', '#f2efeb']]];
        const box = el('div.modes', {}, modes.map(([k, t, s, c]) => {
          const b = el('button.mode' + (Prefs.mode === k ? '.on' : ''), { 'aria-pressed': Prefs.mode === k ? 'true' : 'false', onclick: () => { Prefs.mode = k; savePrefs(); applyTheme(); render(); } },
            el('div.pv', { style: { background: `linear-gradient(90deg, #6a4f36 50%, #b58d62 50%)` } }, el('i', { style: { background: `linear-gradient(90deg, ${c[0]} 50%, ${c[1]} 50%)` } }), el('b', { style: { background: `linear-gradient(90deg, ${c[0]} 50%, ${c[1]} 50%)`, opacity: '.9' } })),
            el('span', { text: t }), el('small', { text: s }));
          return b;
        }));
        const sw = el('div.swatches', {}, Object.keys(ACCENTS).map(k => el('button.swatch' + (Prefs.accent === k ? '.on' : ''), { title: ACCENTS[k].name, 'aria-label': ACCENTS[k].name, style: { background: ACCENTS[k][effMode()] }, onclick: () => { Prefs.accent = k; savePrefs(); applyTheme(); render(); } })));
        return [el('h2', { text: 'Appearance' }), el('p.lede', { text: 'Night shift and Day shift, named after the hours they were designed for.' }), box,
          el('h3', { text: 'Accent color' }), el('div.st-group', {}, el('div.st-row', {}, sw)),
          el('h3', { text: 'Desktop' }), el('div.st-group', {}, row('Pinned note', 'The “Start here” note on the desktop', toggleSwitch(Prefs.note, v => { Prefs.note = v; savePrefs(); Desk.note(); })),
            row('Show hidden files', 'In Files, show names that start with a dot', toggleSwitch(Prefs.hidden, v => { Prefs.hidden = v; savePrefs(); Bus.emit('fs', '*'); })),
            row('Welcome at login', 'Open the Welcome app after signing in', toggleSwitch(Prefs.welcome, v => { Prefs.welcome = v; savePrefs(); })))];
      },
      background() {
        const opts = [['auto', 'Automatic', 'Strata, following the style']].concat(Object.keys(WALLS).map(k => [k, WALLS[k].name, WALLS[k].sub]));
        return [el('h2', { text: 'Background' }), el('p.lede', { text: 'Every wallpaper is drawn live for your screen size.' }),
          el('div.wp-grid', {}, opts.map(([k, t, s]) => el('button.wp' + (Prefs.wall === k ? '.on' : ''), { 'aria-pressed': Prefs.wall === k ? 'true' : 'false', onclick: () => { Wall.set(k); render(); } },
            k === 'auto' ? el('div.auto', {}, el('img', { src: Wall.url('strata', 320, 200), alt: '' }), el('img', { src: Wall.url('strata-day', 320, 200), alt: '' })) : el('img', { src: Wall.url(k, 320, 200), alt: '' }),
            el('span', {}, t, el('small', { text: s })))))];
      },
      sound() {
        const r = el('input.range', { type: 'range', min: '0', max: '100', value: String(Math.round(Prefs.volume * 100)), 'aria-label': 'Output volume', style: { width: '200px' } });
        r.addEventListener('input', () => setVolume(r.value / 100)); r.addEventListener('change', () => Snd.play('vol'));
        return [el('h2', { text: 'Sound' }), el('p.lede', { text: 'Output goes through Built-in Audio.' }),
          el('div.st-group', {}, row('Output volume', `${Math.round(Prefs.volume * 100)}%`, r), row('System sounds', 'Login chime, notifications and alerts', toggleSwitch(Prefs.sounds, v => { Prefs.sounds = v; savePrefs(); })),
            row('Test', 'Play the login chime', el('button.btn', { text: 'Play', onclick: () => Snd.play('login') })))];
      },
      about() {
        const upd = el('button.btn', { text: 'Check for Updates' });
        upd.addEventListener('click', () => { upd.disabled = true; upd.textContent = 'Checking…'; setTimeout(() => { upd.textContent = 'Up to date'; }, 1400); });
        const up = el('span.v', { text: uptimeStr() });
        return [el('div.about-head', {}, el('span', { html: icon('logo') }), el('div', {}, el('b', { text: 'LithOS' }), el('small', { text: 'Version 26.09 “Overburden” · named after lithology, the rock column of a borehole log' }))),
          el('h3', { text: 'Device' }),
          el('div.st-group', {}, row('Device name', null, el('span.v', { text: 'nj-01' })), row('Owner', null, el('span.v', { text: 'Naji Ullah' })),
            row('Processor', null, el('span.v', { text: 'Naji Ullah × 2 (day, night)' })), row('Memory', null, el('span.v', { text: '16 GiB' })), row('Disk', null, el('span.v', { text: '512 GB NVMe' })), row('Uptime', null, up)),
          el('h3', { text: 'Software' }),
          el('div.st-group', {}, row('OS', null, el('span.v', { text: 'LithOS 26.09 (Overburden), 64-bit' })), row('Kernel', null, el('span.v', { text: 'Linux 6.18.4-nj' })), row('Desktop', null, el('span.v', { text: 'Strata 6.2 on Wayland' })),
            row('Home page', null, el('a.v', { href: ME.site, target: '_blank', rel: 'noopener', text: 'naji.codes', style: { color: 'var(--accent)' } })), row('Updates', null, upd))];
      }
    };
    const render = () => {
      $$('.st-nav', side).forEach(b => b.classList.toggle('on', b.dataset.p === cur));
      main.replaceChildren(...P[cur]());
    };
    return WM.open({
      app: 'settings', title: 'Settings', icon: 'settings', w: 800, h: 560, minW: 340, minH: 300,
      render(body, w) {
        side = el('nav.st-side', { 'aria-label': 'Settings pages' }, pages.map(([k, t, ic]) => el('button.st-nav', { 'data-p': k, html: li(ic) + `<span>${t}</span>`, onclick: () => { cur = k; render(); } })));
        main = el('div.st-main');
        const mob = el('div.tbar', { style: { display: isPhone() ? 'flex' : 'none', overflowX: 'auto' } }, pages.map(([k, t]) => el('button.btn', { text: t, onclick: () => { cur = k; render(); } })));
        body.append(mob, el('div.st', {}, side, main));
        w.page = k => { cur = k; render(); };
        w.cleanups = [Bus.on('theme', () => { if (cur === 'appearance') render(); })];
        render();
      }
    });
  }
});

/* ================= Calculator ================= */
Apps.def('calc', {
  name: 'Calculator', icon: 'calc', single: true,
  open() {
    let cur = '0', acc = null, op = null, fresh = true, expr = '';
    let dCur, dEx;
    const fmt = v => { if (!isFinite(v)) return 'Error'; const s = String(parseFloat(v.toPrecision(12))); return s.length > 14 ? v.toExponential(7) : s; };
    const ap = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b;
    const show = () => { dCur.textContent = cur; dEx.textContent = expr || ' '; };
    const digit = d => { if (cur === 'Error') { cur = '0'; fresh = true; } if (fresh) { cur = d === '.' ? '0.' : d; fresh = false; } else if (d === '.' && cur.includes('.')) return; else if (cur.replace('-', '').length < 15) cur = cur === '0' && d !== '.' ? d : cur + d; show(); };
    const setOp = o => { const v = parseFloat(cur); if (op && !fresh) { acc = ap(acc, v, op); cur = fmt(acc); } else if (acc === null || !op) acc = v; op = o; fresh = true; expr = `${fmt(acc)} ${o}`; show(); };
    const eq = () => { if (!op) return; const v = parseFloat(cur), r = ap(acc, v, op); expr = `${fmt(acc)} ${op} ${fmt(v)} =`; cur = fmt(r); acc = null; op = null; fresh = true; show(); };
    const clr = () => { cur = '0'; acc = null; op = null; fresh = true; expr = ''; show(); };
    const back = () => { if (fresh) return; cur = cur.length > 1 ? cur.slice(0, -1) : '0'; if (cur === '-') cur = '0'; show(); };
    const keys = [['C', 'fn', clr], ['±', 'fn', () => { if (cur !== '0') { cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur; show(); } }], ['%', 'fn', () => { cur = fmt(parseFloat(cur) / 100); show(); }], ['÷', 'op', () => setOp('÷')],
      ['7'], ['8'], ['9'], ['×', 'op', () => setOp('×')], ['4'], ['5'], ['6'], ['−', 'op', () => setOp('−')], ['1'], ['2'], ['3'], ['+', 'op', () => setOp('+')], ['0', 'zero'], ['.'], ['=', 'eq', eq]];
    return WM.open({
      app: 'calc', title: 'Calculator', icon: 'calc', w: 320, h: 450, minW: 260, minH: 360,
      render(body, w) {
        dEx = el('div.ex'); dCur = el('div.cur', { 'aria-live': 'polite' });
        body.append(el('div.calc', { tabindex: '0' }, el('div.calc-disp', {}, dEx, dCur), el('div.calc-keys', {}, keys.map(([k, c, f]) => el('button.ck' + (c ? '.' + c : ''), { text: k, onclick: () => { f ? f() : digit(k); Snd.play('click'); } })))));
        w.el.addEventListener('keydown', e => {
          const k = e.key;
          if (/^[0-9.]$/.test(k)) digit(k); else if (k === '+') setOp('+'); else if (k === '-') setOp('−'); else if (k === '*' || k === 'x') setOp('×'); else if (k === '/') { e.preventDefault(); setOp('÷'); }
          else if (k === 'Enter' || k === '=') { e.preventDefault(); eq(); } else if (k === 'Backspace') back(); else if (k === 'Delete' || k.toLowerCase() === 'c') clr(); else return;
        });
        w.onFocus = () => { if (!w.el.contains(document.activeElement)) $('.calc', body).focus({ preventScroll: true }); };
        show();
      }
    });
  }
});

/* ================= Mines ================= */
const FACE = {
  smile: '<circle cx="16" cy="16" r="13" fill="#eaa53e"/><circle cx="11.5" cy="13" r="1.8" fill="#1b1408"/><circle cx="20.5" cy="13" r="1.8" fill="#1b1408"/><path d="M10.5 19a6.5 6.5 0 0 0 11 0" fill="none" stroke="#1b1408" stroke-width="2" stroke-linecap="round"/>',
  wow: '<circle cx="16" cy="16" r="13" fill="#eaa53e"/><circle cx="11.5" cy="13" r="1.8" fill="#1b1408"/><circle cx="20.5" cy="13" r="1.8" fill="#1b1408"/><circle cx="16" cy="21" r="2.8" fill="#1b1408"/>',
  dead: '<circle cx="16" cy="16" r="13" fill="#eaa53e"/><path d="M9.5 11l4 4M13.5 11l-4 4M18.5 11l4 4M22.5 11l-4 4" stroke="#1b1408" stroke-width="2" stroke-linecap="round"/><path d="M11 22a6.5 6.5 0 0 1 10 0" fill="none" stroke="#1b1408" stroke-width="2" stroke-linecap="round"/>',
  cool: '<circle cx="16" cy="16" r="13" fill="#eaa53e"/><path d="M7 12h18v1.5l-1.5 3.5h-5L17 13.5h-2L13.5 17h-5L7 13.5z" fill="#1b1408"/><path d="M10.5 20.5a6.5 6.5 0 0 0 11 0" fill="none" stroke="#1b1408" stroke-width="2" stroke-linecap="round"/>'
};
Apps.def('mines', {
  name: 'Mines', icon: 'mines', single: true,
  open() {
    const LV = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40] };
    let lv = 'Beginner', W, H, M, cells, over, started, flags, opened, t0, timer, board, cnt, face, clock, flagMode = false, segEl;
    const win = WM.open({
      app: 'mines', title: 'Mines', icon: 'mines', w: 330, h: 460, minW: 280, minH: 380,
      render(body, w) {
        cnt = el('span.mn-count'); clock = el('span.mn-count');
        face = el('button.mn-face', { 'aria-label': 'New game', title: 'New game', onclick: () => reset() });
        const seg = el('div.seg', {}, Object.keys(LV).map(k => el('button', { text: k, 'data-l': k, onclick: () => { lv = k; reset(); fitWin(); } })));
        const fl = el('button.btn', { html: li('flag') + '<span>Flag</span>', title: 'Flag mode for touch', onclick: () => { flagMode = !flagMode; fl.classList.toggle('pri', flagMode); } });
        board = el('div.mn-board', { role: 'grid', 'aria-label': 'Minefield' });
        body.append(el('div.mines', {}, el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' } }, seg, fl), el('div.mn-head', {}, cnt, face, clock), board));
        w.cleanups = [() => clearInterval(timer)];
        segEl = seg;
      }
    });
    const fitWin = () => { const cs = 30; WM.resizeTo(win, Math.max(330, W * cs + 60), H * cs + 180); };
    const setFace = f => { face.innerHTML = `<svg viewBox="0 0 32 32">${FACE[f]}</svg>`; };
    const pad = n => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
    const reset = () => {
      [W, H, M] = LV[lv]; cells = []; over = false; started = false; flags = 0; opened = 0; clearInterval(timer);
      $$('button', segEl).forEach(b => b.classList.toggle('on', b.dataset.l === lv));
      cnt.textContent = pad(M); clock.textContent = '000'; setFace('smile');
      board.style.gridTemplateColumns = `repeat(${W}, 28px)`; board.innerHTML = '';
      for (let i = 0; i < W * H; i++) {
        const c = { i, mine: false, n: 0, open: false, flag: false, el: el('button.mc', { 'aria-label': 'Hidden' }) };
        c.el.addEventListener('pointerdown', e => { if (e.button === 0 && !over) setFace('wow'); });
        c.el.addEventListener('pointerup', () => { if (!over) setFace('smile'); });
        c.el.addEventListener('click', () => { if (recentLP(c.el)) return; if (flagMode) toggleFlag(c); else if (c.open) chord(c); else reveal(c); });
        onCtx(c.el, () => toggleFlag(c));
        cells.push(c); board.append(c.el);
      }
    };
    const nb = i => { const x = i % W, y = (i / W) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(ny * W + nx); } return r; };
    const plant = safe => {
      const ban = new Set([safe, ...nb(safe)]); let k = 0;
      while (k < M) { const i = Math.floor(Math.random() * W * H); if (!cells[i].mine && !ban.has(i)) { cells[i].mine = true; k++; } }
      cells.forEach(c => { c.n = nb(c.i).filter(j => cells[j].mine).length; });
      started = true; t0 = Date.now(); timer = setInterval(() => { clock.textContent = pad(Math.floor((Date.now() - t0) / 1000)); }, 250);
    };
    const toggleFlag = c => { if (over || c.open) return; c.flag = !c.flag; flags += c.flag ? 1 : -1; c.el.classList.toggle('flag', c.flag); c.el.innerHTML = c.flag ? li('flag') : ''; c.el.setAttribute('aria-label', c.flag ? 'Flagged' : 'Hidden'); cnt.textContent = pad(M - flags); };
    const openCell = c => {
      if (c.open || c.flag) return;
      c.open = true; opened++; c.el.classList.add('open');
      c.el.setAttribute('aria-label', c.n ? String(c.n) : 'Empty');
      if (c.n) { c.el.textContent = c.n; c.el.classList.add('n' + c.n); }
    };
    const reveal = c => {
      if (over || c.flag || c.open) return;
      if (!started) plant(c.i);
      if (c.mine) return lose(c);
      const stack = [c];
      while (stack.length) { const x = stack.pop(); if (x.open || x.flag) continue; openCell(x); if (!x.n) nb(x.i).forEach(j => { if (!cells[j].open && !cells[j].mine) stack.push(cells[j]); }); }
      check();
    };
    const chord = c => { if (!c.n) return; const ns = nb(c.i).map(j => cells[j]); if (ns.filter(x => x.flag).length === c.n) ns.forEach(x => { if (!x.flag && !x.open) reveal(x); }); };
    const lose = c => {
      over = true; clearInterval(timer); setFace('dead'); Snd.play('boom');
      cells.forEach(x => { if (x.mine && !x.flag) { x.el.classList.add('open'); x.el.innerHTML = '<svg viewBox="0 0 24 24" class="li"><circle cx="12" cy="12" r="5.5" fill="currentColor"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" stroke="currentColor" stroke-width="2"/></svg>'; } if (!x.mine && x.flag) x.el.style.opacity = '.45'; });
      c.el.classList.add('boom');
    };
    const check = () => {
      if (opened === W * H - M) {
        over = true; clearInterval(timer); setFace('cool'); Snd.play('win');
        cells.forEach(x => { if (x.mine && !x.flag) toggleFlag(x); });
        const s = Math.floor((Date.now() - t0) / 1000);
        Notif.push({ title: 'Field cleared', body: `${lv} board in ${s} seconds.`, icon: 'mines' });
      }
    };
    reset();
    return win;
  }
});

/* ================= Snake ================= */
Apps.def('snake', {
  name: 'Snake', icon: 'snake', single: true,
  open() {
    const N = 20;
    let snake, dir, nextDir, food, score, best = Store.get('snakeBest', 0), timer, state = 'ready', cv, ctx, ov, sEl, bEl, cell = 18;
    const place = () => { do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (snake.some(s => s[0] === food[0] && s[1] === food[1])); };
    const reset = () => { snake = [[8, 10], [7, 10], [6, 10]]; dir = [1, 0]; nextDir = [1, 0]; score = 0; place(); sEl.textContent = 0; draw(); };
    const overlay = (t, s) => { ov.hidden = false; ov.innerHTML = ''; ov.append(el('b', { text: t }), el('small', { text: s })); };
    const start = () => { if (state === 'over') reset(); state = 'run'; ov.hidden = true; clearInterval(timer); timer = setInterval(tick, 110); };
    const pause = () => { if (state !== 'run') return; state = 'paused'; clearInterval(timer); overlay('Paused', 'Press Space or tap to continue'); };
    const tick = () => {
      dir = nextDir;
      const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || snake.some(s => s[0] === h[0] && s[1] === h[1])) {
        state = 'over'; clearInterval(timer); Snd.play('error');
        if (score > best) { best = score; Store.set('snakeBest', best); bEl.textContent = best; }
        overlay(`Game over · ${score}`, 'Press Space or tap to play again'); return;
      }
      snake.unshift(h);
      if (h[0] === food[0] && h[1] === food[1]) { score++; sEl.textContent = score; Snd.play('eat'); place(); } else snake.pop();
      draw();
    };
    const draw = () => {
      if (!ctx) return;
      const s = cell, W = N * s;
      ctx.fillStyle = cssVar('--surface-2'); ctx.fillRect(0, 0, W, W);
      ctx.fillStyle = cssVar('--line-soft');
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) ctx.fillRect(i * s, j * s, s, s);
      ctx.fillStyle = '#e5584d'; ctx.beginPath(); ctx.arc(food[0] * s + s / 2, food[1] * s + s / 2, s * 0.36, 0, 7); ctx.fill();
      snake.forEach((p, i) => { ctx.fillStyle = i === 0 ? cssVar('--accent') : cssVar('--ok'); rrect(ctx, p[0] * s + 1.5, p[1] * s + 1.5, s - 3, s - 3, 4); ctx.fill(); });
    };
    const size = () => { const st = cv.parentNode, avail = Math.min(st.clientWidth - 24, st.clientHeight - 12); cell = Math.max(10, Math.floor(avail / N)); const dpr = window.devicePixelRatio || 1; cv.width = N * cell * dpr; cv.height = N * cell * dpr; cv.style.width = cv.style.height = N * cell + 'px'; ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); };
    const turn = (x, y) => { if (dir[0] === -x && dir[1] === -y) return; nextDir = [x, y]; if (state === 'ready') start(); };
    return WM.open({
      app: 'snake', title: 'Snake', icon: 'snake', w: 440, h: 520, minW: 300, minH: 360,
      render(body, w) {
        sEl = el('b', { text: '0' }); bEl = el('b', { text: best });
        cv = el('canvas', { 'aria-label': 'Snake board' });
        ov = el('div.ov', { role: 'button', tabindex: '0' });
        ov.addEventListener('click', () => { if (state === 'paused') { state = 'run'; ov.hidden = true; timer = setInterval(tick, 110); } else start(); });
        const stage = el('div.stage', { tabindex: '0' }, cv, ov);
        body.append(el('div.snake', {}, el('div.bar', {}, el('span', {}, 'Score ', sEl), el('span', { text: 'Arrows or WASD · Space pauses' }), el('span', {}, 'Best ', bEl)), stage));
        w.el.addEventListener('keydown', e => {
          const k = e.key.toLowerCase(), m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
          if (m) { e.preventDefault(); turn(m[0], m[1]); }
          else if (k === ' ') { e.preventDefault(); if (state === 'run') pause(); else if (state === 'paused') { state = 'run'; ov.hidden = true; timer = setInterval(tick, 110); } else start(); }
        });
        let tx, ty;
        stage.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
        stage.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1); });
        const ro = new ResizeObserver(size); ro.observe(stage);
        w.cleanups = [() => clearInterval(timer), () => ro.disconnect(), Bus.on('theme', draw), Bus.on('accent', draw)];
        w.onFocus = () => stage.focus({ preventScroll: true });
        w.el.addEventListener('focusout', () => setTimeout(() => { if (!w.el.contains(document.activeElement)) pause(); }, 0));
        reset(); overlay('Snake', 'Press Space or tap to start'); setTimeout(size, 30);
      }
    });
  }
});

/* ================= Contact ================= */
Apps.def('contact', {
  name: 'Contact Naji', icon: 'contact', single: true,
  open() {
    return WM.open({
      app: 'contact', title: 'Contact Naji', icon: 'contact', w: 460, h: 600, minW: 320, minH: 400,
      render(body, w) {
        const lt = el('span.val');
        const tick = () => { lt.textContent = `Lahore, Pakistan · ${fmtTime(new Date(), 'Asia/Karachi')} local time`; };
        tick(); const iv = setInterval(tick, 15000);
        const linkRow = (ic, label, href, text) => el('div.crow', {}, el('span', { html: li(ic) }), el('div.grow', {}, el('small', { text: label }), el('a.val', { href, target: '_blank', rel: 'noopener', text })), el('a.btn', { href, target: '_blank', rel: 'noopener', html: li('ext') + '<span>Open</span>', 'aria-label': `Open ${label}` }));
        body.append(el('div.contact', {},
          el('div.avatar.md', { text: 'NU' }), el('h2', { text: 'Naji Ullah' }), el('div.role', { text: 'Full-stack software engineer' }),
          el('span.pill', {}, el('i'), 'Available for interesting work'),
          el('div.clist', {},
            el('div.crow', {}, el('span', { html: li('mail') }), el('div.grow', {}, el('small', { text: 'Email' }), el('span.val', { text: ME.email })), el('button.btn', { html: li('copy') + '<span>Copy</span>', onclick: () => copyText(ME.email, 'Email address copied') })),
            linkRow('code', 'GitHub', ME.github, 'github.com/Naji-Ullah'),
            linkRow('brief', 'LinkedIn', ME.linkedin, 'linkedin.com/in/naji-ullah-53222624b'),
            linkRow('globe', 'Website', ME.site, 'naji.codes'),
            el('div.crow', {}, el('span', { html: li('pin') }), el('div.grow', {}, el('small', { text: 'Location' }), lt))),
          el('div.cacts', {}, el('a.btn.pri', { href: `mailto:${ME.email}?subject=${encodeURIComponent('Hello from LithOS')}`, html: li('mail') + '<span>Write an email</span>' }), el('button.btn', { html: li('doc') + '<span>View résumé</span>', onclick: () => openPath(HOME + '/Desktop/Resume.pdf') }))));
        w.cleanups = [() => clearInterval(iv)];
      }
    });
  }
});

/* ================= Welcome ================= */
Apps.def('welcome', {
  name: 'Welcome', icon: 'logo', single: true,
  open() {
    const cards = [
      ['file-md', 'About me', 'README.md, the short version', () => openPath(HOME + '/Desktop/README.md')],
      ['folder-projects', 'Projects', 'Seven case studies in Files', () => Apps.launch('files', { path: HOME + '/Projects' })],
      ['file-pdf', 'Résumé', 'Two pages in Document Viewer', () => openPath(HOME + '/Desktop/Resume.pdf')],
      ['monitor', 'Skills', 'Running live in System Monitor', () => Apps.launch('monitor', { tab: 'processes' })],
      ['terminal', 'Terminal', 'Try help, neofetch or man naji', () => Apps.launch('terminal', { run: 'neofetch' })],
      ['contact', 'Contact', 'Email, GitHub and LinkedIn', () => Apps.launch('contact')],
      ['doom', 'Games', 'DOOM, a 3D racer, chess, cards and more', () => Apps.launch('files', { path: HOME + '/Games' })]
    ];
    return WM.open({
      app: 'welcome', title: 'Welcome to LithOS', icon: 'logo', w: 700, h: 540, minW: 320, minH: 360,
      render(body) {
        body.append(el('div.welcome', {},
          el('div.wl-hero', {}, el('span', { html: icon('logo') }), el('div', {}, el('h1', { text: 'Welcome to LithOS 26.09' }), el('p', { text: 'This desktop is Naji Ullah’s portfolio, a full-stack software engineer in Lahore. Poke around like it’s your own machine: open files, drag windows, run commands.' }))),
          el('div.wl-grid', {}, cards.map(([ic, t, s, fn]) => el('button.wl-card', { onclick: fn }, el('span', { html: icon(ic) }), el('span', {}, el('b', { text: t }), el('small', { text: s }))))),
          el('div.wl-foot', {}, el('label', {}, toggleSwitch(Prefs.welcome, v => { Prefs.welcome = v; savePrefs(); }, 'Show at login'), 'Show this window at login'),
            el('span', { text: 'Tip: right-click the desktop, or drag a window to a screen edge.' }))));
      }
    });
  }
});

/* ================= Web Browser ================= */
const naji = {
  page() {
    const d = el('div.nc');
    const bands = ['#8a6a48', '#b27a3d', '#9c5a3c', '#5d6b78', '#3f3a36'];
    d.innerHTML = `
      <header class="nc-hero"><div class="nc-eye">Borehole log · NJ-01 · Portfolio</div><h1>Naji Ullah</h1><p>Full-stack software engineer. Ships by day, studies by night.</p>
        <div class="nc-meta"><div><small>Location</small>Lahore, PK</div><div><small>Drilling since</small>Feb 2025</div><div><small>Status</small>Still drilling · available for interesting work</div></div></header>
      <section class="nc-layer" style="--band:${bands[0]}"><div class="nc-rail"><span>Overburden<small>0 – 2 m</small></span></div><div class="nc-body"><h2>Experience</h2>
        ${EXPERIENCE.map(e => `<div class="nc-job"><h3>${esc(e.role)} · ${esc(e.company)}</h3><div class="dt">${esc(e.dates)}</div><p>${esc(e.body[0])}</p></div>`).join('')}</div></section>
      <section class="nc-layer" style="--band:${bands[1]}"><div class="nc-rail"><span>Core samples<small>2 – 30 m</small></span></div><div class="nc-body"><h2>Projects</h2>
        ${PROJECTS.map(p => `<div class="nc-core"><h3>${esc(p.name)}<span class="cat">${esc(p.cat)}</span></h3><p>${esc(p.blurb)}</p><div class="nc-chips"><span>${esc(p.role)}</span>${p.stack.map(s => `<span>${esc(s)}</span>`).join('')}</div></div>`).join('')}</div></section>
      <section class="nc-layer" style="--band:${bands[2]}"><div class="nc-rail"><span>Lab analysis<small>assay</small></span></div><div class="nc-body"><h2>Skills</h2><div class="nc-assay">
        ${SKILLS.map(s => `<div><h3>${esc(s.group)}</h3><p class="nt">${esc(s.note)}</p>${s.main.map(([n, t]) => { const k = usedIn(t).length; return `<div class="nc-sk"><span class="nm">${esc(n)}</span><span class="br">${Array.from({ length: 7 }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span><span class="x">×${k}</span></div>`; }).join('')}<div class="nc-also">Also on hand: ${esc(s.also.join(', '))}</div></div>`).join('')}</div></div></section>
      <section class="nc-layer" style="--band:${bands[3]}"><div class="nc-rail"><span>Bedrock<small>foundation</small></span></div><div class="nc-body"><h2>Education</h2><div class="nc-job"><h3>BS Software Engineering · COMSATS University, Lahore</h3><div class="dt">2024 – present</div><p>Studying it by night, applying it by deadline.</p></div></div></section>
      <section class="nc-end"><div class="nc-eye">End of hole</div><h2>Available for interesting work.</h2><p>${esc(ME.email)} · <a href="${ME.github}" target="_blank" rel="noopener">GitHub ↗</a> · <a href="${ME.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a></p></section>
      <footer class="nc-foot"><span>© MMXXVI Naji Ullah</span><span>Hand-built in Lahore · No trackers</span></footer>`;
    return d;
  }
};
/* real browsing: pages load in sandboxed frames; sites that refuse embedding open in a new tab */
const WEB = {
  blocked: false,
  noFrame: ['github.com', 'linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'threads.net', 'reddit.com', 'stackoverflow.com',
    'news.ycombinator.com', 'amazon.com', 'netflix.com', 'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com', 'whatsapp.com', 'discord.com',
    'mail.google.com', 'accounts.google.com', 'drive.google.com', 'docs.google.com', 'gmail.com', 'apple.com', 'microsoft.com', 'live.com', 'outlook.com',
    'bing.com', 'duckduckgo.com', 'medium.com', 'notion.so', 'figma.com', 'tiktok.com', 'pinterest.com', 'paypal.com', 'stripe.com', 'salesforce.com',
    'vercel.com', 'npmjs.com', 'zapier.com', 'comsats.edu.pk', 'youtube.com'],
  known: ['google.com', 'wikipedia.org', 'youtube.com', 'openstreetmap.org', 'naji.codes', 'wikimedia.org'],
  names: { 'google.com': 'Google', 'wikipedia.org': 'Wikipedia', 'youtube.com': 'YouTube', 'openstreetmap.org': 'OpenStreetMap', 'naji.codes': 'Naji Ullah — Portfolio' },
  host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u || ''); } },
  match(h, list) { return list.some(d => h === d || h.endsWith('.' + d)); },
  name(u) { const h = this.host(u); const k = Object.keys(this.names).find(d => h === d || h.endsWith('.' + d)); return k ? this.names[k] : h; },
  frameSrc(u) {
    let url; try { url = new URL(u); } catch (e) { return null; }
    if (!/^https?:$/.test(url.protocol)) return null;
    const h = url.hostname.replace(/^www\./, '');
    if (/^google\.[a-z.]+$/.test(h)) { if (url.pathname === '/') url.pathname = '/webhp'; url.searchParams.set('igu', '1'); return url.href; }
    if (h === 'youtu.be') return 'https://www.youtube.com/embed/' + url.pathname.slice(1);
    if (h === 'youtube.com' || h === 'm.youtube.com') {
      if (url.pathname.startsWith('/embed/')) return url.href;
      const v = url.searchParams.get('v'); return v ? 'https://www.youtube.com/embed/' + encodeURIComponent(v) : null;
    }
    if (h === 'openstreetmap.org' && !url.pathname.startsWith('/export/embed')) return null;
    if (this.match(h, this.noFrame)) return null;
    return url.href;
  }
};
document.addEventListener('securitypolicyviolation', e => {
  const d = e.effectiveDirective || e.violatedDirective || '';
  if (/^(frame-src|child-src)/.test(d)) Bus.emit('frame-blocked', e.blockedURI || '', true);
  else if (/^default-src/.test(d)) Bus.emit('frame-blocked', e.blockedURI || '', false);
});
const LAHORE_MAP = 'https://www.openstreetmap.org/export/embed.html?bbox=74.20,31.42,74.45,31.62&layer=mapnik';

Apps.def('web', {
  name: 'Web Browser', icon: 'web', single: true,
  reuse(w, a) { if (a.url && w.newTab) w.newTab(a.url); },
  open(args) {
    const tabs = []; let active = null, tabBar, addr, view, prog, bBack, bFwd, extA, win;
    const norm = u => {
      u = (u || '').trim();
      if (!u) return 'lithos://start';
      if (/^lithos:\/\//.test(u)) return u;
      if (/^(https?:\/\/)?(www\.)?naji\.codes\/?$/i.test(u)) return 'https://naji.codes/';
      if (/^https?:\/\//i.test(u)) return u;
      if (/^localhost(:\d+)?(\/\S*)?$/.test(u)) return 'http://' + u;
      if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(u)) return 'https://' + u;
      return 'https://www.google.com/search?q=' + encodeURIComponent(u);
    };
    const prog0 = () => { prog.style.transition = 'none'; prog.style.opacity = '1'; prog.style.width = '0'; void prog.offsetWidth; prog.style.transition = ''; prog.style.width = '70%'; };
    const prog1 = () => { prog.style.width = '100%'; setTimeout(() => { prog.style.opacity = '0'; }, 250); };
    const outLink = (u, label) => el('a.btn.pri', { href: u, target: '_blank', rel: 'noopener', html: li('ext') + `<span>${esc(label)}</span>` });
    const framePage = (t, src, u) => {
      const h = WEB.host(u);
      const ifr = el('iframe.wifr', { src, title: WEB.name(u), sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-modals allow-downloads', allow: 'fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write', referrerpolicy: 'strict-origin-when-cross-origin' });
      ifr.addEventListener('load', () => { if (!t.loading) return; t.loading = false; renderTabs(); if (t === active) prog1(); });
      const wrap = el('div.wframe', {}, ifr, el('div.wshield'));
      if (!WEB.match(h, WEB.known)) {
        const tip = el('div.wtip', { hidden: true }, el('span', { text: 'Page stays blank? Some sites don’t allow being shown inside another page.' }), el('a', { href: u, target: '_blank', rel: 'noopener', text: 'Open in new tab ↗' }), el('button.x', { 'aria-label': 'Dismiss', html: li('close'), onclick: () => tip.remove() }));
        wrap.append(tip);
        setTimeout(() => { if (tip.isConnected) tip.hidden = false; }, 2200);
        setTimeout(() => { if (tip.isConnected) tip.remove(); }, 14000);
      }
      return wrap;
    };
    const build = (t, u) => {
      if (u === 'lithos://start') {
        const s = el('input', { placeholder: 'Search Google or type a web address', 'aria-label': 'Search or address' });
        s.addEventListener('keydown', e => { if (e.key === 'Enter') nav(s.value); });
        const dial = (label, content, go, href) => {
          const inner = [el('span.dic', { html: content }), el('span', { text: label })];
          return href ? el('a.dial', { href, target: '_blank', rel: 'noopener', title: `${label} opens in a new tab` }, inner) : el('button.dial', { onclick: go }, inner);
        };
        return { title: 'New Tab', fav: li('star'), node: el('div.startpg', {}, el('span.logo', { html: icon('logo') }), el('h1', { text: fmtTime(new Date()) }), el('label.search', {}, el('span', { html: li('search') }), s),
          el('div.dials', {},
            dial('naji.codes', icon('logo'), () => nav('https://naji.codes/')), dial('Google', li('search'), () => nav('https://www.google.com/')),
            dial('Wikipedia', li('doc'), () => nav('https://en.wikipedia.org/wiki/Lahore')), dial('Lahore map', li('pin'), () => nav(LAHORE_MAP)),
            dial('GitHub ↗', li('code'), null, ME.github), dial('LinkedIn ↗', li('brief'), null, ME.linkedin), dial('Help', li('info'), () => nav('lithos://help')))) };
      }
      if (u === 'lithos://help') {
        const tips = ['Double-click icons to open them. On touch screens, tap.', 'Right-click (or long-press) the desktop, files, windows and panel buttons for more options.', 'Drag a window to the top edge to maximize it, or to the left or right edge to fill half the screen.', 'Double-click a title bar to maximize or restore.', 'Ctrl+Alt+T opens a Terminal. Type help there for the command list.', 'Web Browser loads real websites. Type an address or search Google from the address bar.', 'Some sites (GitHub, LinkedIn, YouTube’s home page and others) don’t allow being shown inside another page. Those open in a new tab instead. YouTube video links play here.', 'Settings switches between Night shift and Day shift, and changes the wallpaper and accent color.', 'Files you create live until you reload the page.'];
        return { title: 'LithOS Help', fav: li('info'), node: el('div.md', { style: { height: '100%' } }, el('div.md-in', { html: `<h1>Getting around LithOS</h1><ul>${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` })) };
      }
      if (!Sys.wifi) return { title: 'No internet', fav: li('wifioff'), node: el('div.errpg', {}, el('span', { html: li('wifioff') }), el('h2', { text: 'You’re offline' }), el('p', { text: 'Wi-Fi is turned off. Turn it back on from the network icon in the panel, then reload.' }), el('code', { text: 'ERR_INTERNET_DISCONNECTED' })) };
      const h = WEB.host(u), src = WEB.frameSrc(u);
      if (!src) {
        return { title: WEB.name(u), fav: li('globe'), node: el('div.errpg', {}, el('span', { html: li('globe') }), el('h2', { text: `${h} opens in a new tab` }),
          el('p', { text: `${h} doesn’t allow other sites to show its pages inside them, so it can’t load in this window.` }), el('code', { text: u }),
          el('div.row', {}, outLink(u, `Open ${h}`), el('button.btn', { text: 'Back', onclick: () => go(-1) }))) };
      }
      if (WEB.blocked) {
        if (h === 'naji.codes') return { title: WEB.name(u), fav: icon('logo'), node: el('div', {}, el('div.infobar', {}, el('span', { html: li('info') }), el('span', { text: 'Live websites can’t load in this preview, so this is the saved copy of naji.codes.' }), el('a', { href: ME.site, target: '_blank', rel: 'noopener', text: 'Open live site ↗' })), naji.page()) };
        return { title: WEB.name(u), fav: li('globe'), node: el('div.errpg', {}, el('span', { html: li('globe') }), el('h2', { text: `${h} can’t load in this preview` }),
          el('p', { text: 'This preview window blocks live websites inside it. Where LithOS runs on its own site, pages load right here in the browser.' }), el('code', { text: u }),
          el('div.row', {}, outLink(u, `Open ${h} in a new tab`), el('button.btn', { text: 'Back', onclick: () => go(-1) }))) };
      }
      t.frameSrc = src;
      return { title: WEB.name(u), fav: li('globe'), frame: true, node: framePage(t, src, u) };
    };
    const renderTabs = () => {
      tabBar.querySelectorAll('.wtab').forEach(n => n.remove());
      tabs.forEach(t => {
        const n = el('div.wtab' + (t === active ? '.on' : ''), { role: 'tab', title: t.title }, el('span.fav', { html: t.loading ? '<span class="spin"></span>' : t.fav }), el('span.t', { text: t.title }),
          el('button.x', { 'aria-label': 'Close tab', html: li('close'), onclick: e => { e.stopPropagation(); closeTab(t); } }));
        n.addEventListener('click', () => select(t));
        n.addEventListener('auxclick', e => { if (e.button === 1) closeTab(t); });
        tabBar.insertBefore(n, tabBar.lastChild);
      });
    };
    const show = () => {
      view.querySelectorAll('.wpage').forEach(p => { p.hidden = p !== active.page; });
      if (document.activeElement !== addr) addr.value = active.url.startsWith('lithos://start') ? '' : active.url.replace(/^https:\/\//, '');
      bBack.disabled = active.i <= 0; bFwd.disabled = active.i >= active.hist.length - 1;
      const external = /^https?:/.test(active.url);
      extA.hidden = !external; if (external) extA.href = active.url;
      WM.setTitle(win, `${active.title} — Web Browser`);
    };
    const load = (t, u) => {
      t.url = u; t.loading = true; t.frameSrc = null; clearTimeout(t._lt);
      const r = build(t, u);
      t.title = r.title; t.fav = r.fav;
      const pg = el('div.wpage' + (r.frame ? '.fr' : '')); pg.append(r.node);
      if (t.page) t.page.replaceWith(pg); else view.append(pg);
      t.page = pg; renderTabs();
      if (t === active) { show(); prog0(); }
      if (!r.frame) t._lt = setTimeout(() => { t.loading = false; renderTabs(); if (t === active) prog1(); }, 380);
      else t._lt = setTimeout(() => { if (t.loading) { t.loading = false; renderTabs(); if (t === active) prog1(); } }, 15000);
    };
    const nav = (raw, t) => { t = t || active; const u = norm(raw); t.hist = t.hist.slice(0, t.i + 1); t.hist.push(u); t.i = t.hist.length - 1; load(t, u); };
    const go = d => { const t = active, ni = t.i + d; if (ni < 0 || ni >= t.hist.length) return; t.i = ni; load(t, t.hist[ni]); };
    const select = t => { active = t; renderTabs(); show(); };
    const newTab = u => { const t = { hist: [], i: -1, url: '', title: 'New Tab', fav: li('star') }; tabs.push(t); active = t; nav(u || 'lithos://start', t); if (!u) setTimeout(() => { const s = $('.startpg input', t.page); if (s && !isPhone()) s.focus(); }, 60); };
    const closeTab = t => { const i = tabs.indexOf(t); tabs.splice(i, 1); clearTimeout(t._lt); if (t.page) t.page.remove(); if (!tabs.length) { WM.close(win); return; } if (active === t) active = tabs[Math.min(i, tabs.length - 1)]; renderTabs(); show(); };
    win = WM.open({
      app: 'web', title: 'Web Browser', icon: 'web', w: 1040, h: 680, minW: 340, minH: 300,
      render(body, w) {
        win = w;
        tabBar = el('div.wtabs', { role: 'tablist' }, el('button.wnew', { 'aria-label': 'New tab', title: 'New tab', html: li('plus'), onclick: () => newTab() }));
        addr = el('input', { 'aria-label': 'Address', spellcheck: 'false', autocomplete: 'off', placeholder: 'Search Google or type a web address' });
        addr.addEventListener('keydown', e => { if (e.key === 'Enter') { nav(addr.value); addr.blur(); } if (e.key === 'Escape') { addr.value = active.url; addr.blur(); } });
        addr.addEventListener('focus', () => addr.select());
        bBack = ibtn('back', 'Back', () => go(-1)); bFwd = ibtn('fwd', 'Forward', () => go(1));
        extA = el('a.ibtn', { target: '_blank', rel: 'noopener', title: 'Open this page in a new tab', 'aria-label': 'Open this page in a new tab', html: li('ext') });
        prog = el('div.wprog');
        view = el('div.wview', {}, prog);
        const bm = (label, ic, fn, href) => href ? el('a.bm', { href, target: '_blank', rel: 'noopener', html: ic + `<span>${label}</span>` }) : el('button.bm', { html: ic + `<span>${label}</span>`, onclick: fn });
        body.append(el('div.web', {}, tabBar,
          el('div.tbar', {}, bBack, bFwd, ibtn('reload', 'Reload', () => load(active, active.url)), el('label.addr', {}, el('span', { html: li('lock') }), addr), extA, ibtn('home', 'Home', () => nav('lithos://start'))),
          el('div.bmarks', {}, bm('naji.codes', li('star'), () => nav('https://naji.codes/')), bm('Google', li('search'), () => nav('https://www.google.com/')), bm('Wikipedia', li('doc'), () => nav('https://en.wikipedia.org/wiki/Main_Page')),
            bm('Lahore map', li('pin'), () => nav(LAHORE_MAP)), bm('GitHub ↗', li('code'), null, ME.github), bm('LinkedIn ↗', li('brief'), null, ME.linkedin), bm('Help', li('info'), () => nav('lithos://help'))),
          view));
        w.newTab = newTab;
        w.el.addEventListener('keydown', e => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); addr.focus(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') { e.preventDefault(); newTab(); }
          if (e.altKey && e.key === 'ArrowLeft') go(-1);
          if (e.altKey && e.key === 'ArrowRight') go(1);
        });
        w.cleanups = [Bus.on('frame-blocked', (uri, isFrame) => {
          const hit = tabs.filter(t => t.frameSrc && (isFrame || (uri && WEB.host(uri) === WEB.host(t.frameSrc))));
          if (!hit.length) return;
          WEB.blocked = true;
          hit.forEach(t => load(t, t.url));
        }), Bus.on('sys', () => { if (!Sys.wifi) tabs.forEach(t => { if (/^https?:/.test(t.url)) load(t, t.url); }); })];
        newTab(args.url);
      }
    });
    return win;
  }
});
