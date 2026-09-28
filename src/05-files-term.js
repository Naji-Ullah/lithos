/* ================= Files ================= */
Apps.def('trash', { name: 'Trash', icon: 'trash', alias: () => Apps.launch('files', { path: 'trash://' }) });
Apps.def('files', {
  name: 'Files', icon: 'files',
  keyOf: a => a.path || HOME,
  open(args) {
    const st = { path: args.path || HOME, back: [], fwd: [], sel: new Set(), last: null };
    let main, crumbs, status, bBack, bFwd, bUp, side, vGrid, vList, trashBar, win;
    const label = p => p === 'trash://' ? 'Trash' : p === HOME ? 'Home' : p === '/' ? 'Computer' : FS.base(p);
    const go = (p, how) => {
      if (!p) return;
      if (p !== 'trash://') { const n = FS.get(p); if (!n) { Dialog.alert('Location not found', `“${FS.short(p)}” doesn’t exist.`); return; } if (n.type !== 'dir') { openNode(n, p); return; } }
      if (how === 'back') st.fwd.push(st.path); else if (how === 'fwd') st.back.push(st.path); else if (p !== st.path) { st.back.push(st.path); st.fwd = []; }
      st.path = p; st.sel.clear(); st.last = null; win.key = p; render(); main.scrollTop = 0;
    };
    const items = () => {
      if (st.path === 'trash://') return FS.trash.map((t, i) => ({ name: t.name, node: t.node, path: 'trash://' + i, trash: t, idx: i }));
      const dir = FS.get(st.path);
      return FS.list(dir, Prefs.hidden).map(n => ({ name: n.name, node: n, path: (st.path === '/' ? '' : st.path) + '/' + n.name }));
    };
    const openItem = it => {
      if (it.trash) {
        Dialog.open({ title: `“${it.name}” is in the Trash`, text: 'Restore it to open it.', buttons: [{ label: 'Cancel', value: false, cancel: true }, { label: 'Restore', kind: 'pri', value: true, def: true }] })
          .then(ok => { if (ok) FS.restore(it.idx); });
        return;
      }
      if (it.node.type === 'dir') go(it.path); else openNode(it.node, it.path);
    };
    const selPaths = () => [...st.sel];
    const trashSel = () => { if (st.path === 'trash://') return; Ops.trash(selPaths()); st.sel.clear(); };
    const paint = () => {
      $$('[data-p]', main).forEach(n => n.classList.toggle('sel', st.sel.has(n.dataset.p)));
      const all = items();
      status.textContent = `${all.length} item${all.length === 1 ? '' : 's'}${st.sel.size ? ` · ${st.sel.size} selected` : ''}`;
    };
    const itemEvents = (node, it, list) => {
      node.addEventListener('pointerdown', e => {
        main.focus({ preventScroll: true });
        node._touch = e.pointerType === 'touch';
        if (e.button === 2) { if (!st.sel.has(it.path)) { st.sel = new Set([it.path]); paint(); } return; }
        if (e.ctrlKey || e.metaKey) { if (st.sel.has(it.path)) st.sel.delete(it.path); else st.sel.add(it.path); }
        else if (e.shiftKey && st.last) { const ps = list.map(x => x.path), a = ps.indexOf(st.last), b = ps.indexOf(it.path); st.sel = new Set(ps.slice(Math.min(a, b), Math.max(a, b) + 1)); }
        else st.sel = new Set([it.path]);
        st.last = it.path; paint();
      });
      node.addEventListener('click', () => { if (node._touch && !recentLP(node)) openItem(it); });
      node.addEventListener('dblclick', () => { if (!node._touch) openItem(it); });
      onCtx(node, e => {
        if (!st.sel.has(it.path)) { st.sel = new Set([it.path]); paint(); }
        if (it.trash) {
          Menu.show(e.clientX, e.clientY, [
            { label: 'Restore', icon: 'undo', bold: true, action: () => { const idx = selPaths().map(p => +p.slice(8)).sort((a, b) => b - a); idx.forEach(i => FS.restore(i)); } },
            { label: 'Delete Permanently', icon: 'trash', action: async () => { const idx = selPaths().map(p => +p.slice(8)).sort((a, b) => b - a); if (await Dialog.confirm({ title: `Permanently delete ${idx.length === 1 ? '“' + it.name + '”' : idx.length + ' items'}?`, text: 'This can’t be undone.', ok: 'Delete', danger: true })) { idx.forEach(i => FS.trash.splice(i, 1)); Bus.emit('fs', 'trash://'); Snd.play('trash'); } } },
            { sep: true }, { label: 'Properties', icon: 'info', action: () => Ops.properties(null, it.trash) }]);
        } else Menu.show(e.clientX, e.clientY, Ops.itemMenu(it.path, it.node, { trashSel }));
      });
    };
    const render = () => {
      if (st.path !== 'trash://' && !FS.get(st.path)) { st.path = HOME; st.sel.clear(); }
      WM.setTitle(win, label(st.path));
      bBack.disabled = !st.back.length; bFwd.disabled = !st.fwd.length; bUp.disabled = st.path === '/' || st.path === 'trash://';
      vGrid.classList.toggle('on', Prefs.fmView === 'grid'); vList.classList.toggle('on', Prefs.fmView === 'list');
      crumbs.innerHTML = '';
      if (st.path === 'trash://') crumbs.append(el('button.crumb', { html: li('trash') + '<span>Trash</span>' }));
      else {
        const under = st.path === HOME || st.path.startsWith(HOME + '/');
        const segs = under ? st.path.slice(HOME.length).split('/').filter(Boolean) : st.path.split('/').filter(Boolean);
        let acc = under ? HOME : '';
        crumbs.append(el('button.crumb', { html: li(under ? 'home' : 'drive') + `<span>${under ? 'Home' : 'Computer'}</span>`, onclick: () => go(under ? HOME : '/') }));
        segs.forEach(s => { acc += '/' + s; const to = acc; crumbs.append(el('span.cs', { html: li('fwd') }), el('button.crumb', { text: s, onclick: () => go(to) })); });
        requestAnimationFrame(() => { crumbs.scrollLeft = crumbs.scrollWidth; });
      }
      $$('.fm-pl', side).forEach(p => p.classList.toggle('on', p.dataset.p === st.path));
      const tc = $('.fm-pl[data-p="trash://"] .cnt', side); if (tc) tc.textContent = FS.trash.length || '';
      trashBar.hidden = st.path !== 'trash://';
      main.innerHTML = '';
      const list = items();
      if (!list.length) {
        main.append(el('div.empty', {}, el('span', { html: icon(st.path === 'trash://' ? 'trash' : 'folder') }), el('b', { text: st.path === 'trash://' ? 'Trash is empty' : 'Folder is empty' }),
          st.path === HOME + '/Downloads' ? el('small', { text: 'Nothing downloaded yet.' }) : null));
      } else if (Prefs.fmView === 'list') {
        const tb = el('tbody');
        list.forEach(it => {
          const n = it.node, tr = el('tr', { 'data-p': it.path },
            el('td', {}, el('div.nmc', {}, el('span', { html: icon(nodeIcon(n, it.path)) }), el('span', { text: nodeLabel(n) }))),
            el('td', { text: n.type === 'dir' ? `${Object.keys(n.children).length} items` : fmtSize(FS.size(n)) }),
            el('td', { text: it.trash ? FS.short(it.trash.from) : nodeType(n) }),
            el('td', { text: fmtStamp(it.trash ? it.trash.at : n.mtime) }));
          itemEvents(tr, it, list); tb.append(tr);
        });
        main.append(el('table.fm-list', {}, el('thead', {}, el('tr', {}, el('th', { text: 'Name' }), el('th', { text: 'Size' }), el('th', { text: st.path === 'trash://' ? 'Original Location' : 'Type' }), el('th', { text: st.path === 'trash://' ? 'Trashed' : 'Modified' }))), tb));
      } else {
        const g = el('div.fm-grid');
        list.forEach(it => { const d = el('div.fi', { 'data-p': it.path, title: nodeLabel(it.node) }, el('span.ic', { html: icon(nodeIcon(it.node, it.path)) }), el('span.nm', { text: nodeLabel(it.node) })); itemEvents(d, it, list); g.append(d); });
        main.append(g);
      }
      paint();
    };
    const bgMenu = e => {
      if (st.path === 'trash://') { Menu.show(e.clientX, e.clientY, [{ label: 'Empty Trash', icon: 'trash', action: () => Ops.emptyTrash(), disabled: !FS.trash.length }]); return; }
      Menu.show(e.clientX, e.clientY, [
        { label: 'New Folder', icon: 'folder', kbd: 'Shift+Ctrl+N', action: () => Ops.newFolder(st.path) },
        { label: 'New Text File', icon: 'doc', action: () => Ops.newFile(st.path) },
        { sep: true },
        { label: 'Open in Terminal', icon: 'terminal', action: () => Apps.launch('terminal', { cwd: st.path }) },
        { label: 'Show Hidden Files', checked: Prefs.hidden, kbd: 'Ctrl+H', action: () => { Prefs.hidden = !Prefs.hidden; savePrefs(); render(); } },
        { label: 'View', icon: 'grid', sub: [{ label: 'Grid', checked: Prefs.fmView === 'grid', action: () => setView('grid') }, { label: 'List', checked: Prefs.fmView === 'list', action: () => setView('list') }] },
        { sep: true },
        { label: 'Properties', icon: 'info', action: () => Ops.properties(st.path) }
      ]);
    };
    const setView = v => { Prefs.fmView = v; savePrefs(); render(); };
    win = WM.open({
      app: 'files', title: label(st.path), icon: 'files', w: 860, h: 540, minW: 380, minH: 280, key: st.path,
      render(body, w) {
        bBack = ibtn('back', 'Back', () => go(st.back.pop(), 'back'));
        bFwd = ibtn('fwd', 'Forward', () => go(st.fwd.pop(), 'fwd'));
        bUp = ibtn('up', 'Parent folder', () => go(st.path === HOME ? '/home' : FS.dir(st.path)));
        crumbs = el('div.crumbs');
        vGrid = ibtn('grid', 'Grid view', () => setView('grid'));
        vList = ibtn('list', 'List view', () => setView('list'));
        const more = ibtn('kebab', 'Folder menu', e => { const r = more.getBoundingClientRect(); bgMenu({ clientX: r.left - 150, clientY: r.bottom + 4 }); });
        const places = [['Home', HOME, 'home'], ['Desktop', HOME + '/Desktop', 'desktop'], ['Documents', HOME + '/Documents', 'doc'], ['Downloads', HOME + '/Downloads', 'download'], ['Games', HOME + '/Games', 'spark'], ['Music', HOME + '/Music', 'music'], ['Pictures', HOME + '/Pictures', 'image'], ['Projects', HOME + '/Projects', 'layers'], ['Videos', HOME + '/Videos', 'video']];
        side = el('nav.fm-side', { 'aria-label': 'Places' }, el('h4', { text: 'Places' }),
          places.map(([n, p, ic]) => el('div.fm-pl', { 'data-p': p, role: 'button', tabindex: '0', html: li(ic) + `<span>${n}</span>`, onclick: () => go(p) })),
          el('div.fm-pl', { 'data-p': 'trash://', role: 'button', tabindex: '0', html: li('trash') + '<span>Trash</span><span class="cnt"></span>', onclick: () => go('trash://') }),
          el('h4', { text: 'Devices' }),
          el('div.fm-pl', { 'data-p': '/', role: 'button', tabindex: '0', html: li('drive') + '<span>nvme0n1 · 512 GB</span>', onclick: () => go('/') }));
        onCtx($('.fm-pl[data-p="trash://"]', side), e => Menu.show(e.clientX, e.clientY, [{ label: 'Empty Trash', icon: 'trash', action: () => Ops.emptyTrash(), disabled: !FS.trash.length }]));
        main = el('div.fm-main', { tabindex: '0', 'aria-label': 'Folder contents' });
        main.addEventListener('pointerdown', e => { if (e.target === main || e.target.classList.contains('fm-grid') || e.target.classList.contains('empty')) { st.sel.clear(); paint(); } });
        onCtx(main, e => { if (!e.target.closest('[data-p]')) bgMenu(e); });
        main.addEventListener('keydown', e => {
          const ps = selPaths(), list = items();
          if (e.key === 'Enter' && ps[0]) { const it = list.find(x => x.path === ps[0]); if (it) openItem(it); }
          else if (e.key === 'Delete') trashSel();
          else if (e.key === 'F2' && ps[0] && st.path !== 'trash://') { e.preventDefault(); Ops.rename(ps[0]); }
          else if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) { e.preventDefault(); if (!bUp.disabled) bUp.click(); }
          else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); if (!bBack.disabled) bBack.click(); }
          else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); st.sel = new Set(list.map(x => x.path)); paint(); }
          else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') { e.preventDefault(); Prefs.hidden = !Prefs.hidden; savePrefs(); render(); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); const idx = list.findIndex(x => x.path === (st.last || '')); const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
            const nx = list[clamp(idx + step, 0, list.length - 1)]; if (nx) { st.sel = new Set([nx.path]); st.last = nx.path; paint(); }
          }
        });
        trashBar = el('div.trashbar', { hidden: true }, el('span', { text: 'Items in the Trash can be restored or deleted permanently.' }), el('span.sp'), el('button.btn.dan', { text: 'Empty', onclick: () => Ops.emptyTrash() }));
        status = el('span');
        body.append(
          el('div.tbar', {}, bBack, bFwd, bUp, crumbs, el('span.vsep'), vGrid, vList, more),
          el('div.fm', {}, side, el('div', { style: { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column' } }, trashBar, main)),
          el('div.statusbar', {}, status, el('span.sp'), el('span', { text: '318.4 GB free' })));
        w.cleanups = [Bus.on('fs', p => { if (p === st.path || p === '*' || p === 'trash://' || (st.path !== 'trash://' && !FS.get(st.path))) render(); })];
        w.onFocus = () => { if (!document.activeElement || !w.el.contains(document.activeElement)) main.focus({ preventScroll: true }); };
      }
    });
    render();
    return win;
  },
  reuse(w, args) { /* focused by key */ }
});

/* ================= Terminal ================= */
const TermHistory = [];
let termCount = 0;
Apps.def('terminal', {
  name: 'Terminal', icon: 'terminal',
  open(args) {
    return WM.open({ app: 'terminal', title: 'naji@nj-01: ~', icon: 'terminal', w: 740, h: 460, minW: 320, minH: 200, render: (body, win) => { win.term = new Term(body, win, args.cwd || HOME, args.run); } });
  }
});
function tokenize(s) {
  const out = [], re = /"([^"]*)"|'([^']*)'|((?:\\ |[^\s])+)/g; let m;
  while ((m = re.exec(s))) out.push(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3].replace(/\\ /g, ' '));
  return out;
}
class Term {
  constructor(body, win, cwd, run) {
    this.win = win; this.cwd = FS.get(cwd) ? cwd : HOME; this.hi = TermHistory.length; this.busy = null;
    this.aliases = { ll: 'ls -la', la: 'ls -a', cls: 'clear', ship: 'git push', study: 'open ~/Documents/education.md' };
    this.out = el('div.term', { role: 'log', 'aria-label': 'Terminal output' });
    this.row = el('div.in-row'); this.ps = el('span'); this.inp = el('input', { spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Command' });
    this.row.append(this.ps, this.inp); this.out.append(this.row); body.append(this.out);
    if (termCount++ === 0) {
      this.print(esc(MOTD));
      const d = new Date(Date.now() - 1000 * 60 * 47);
      this.print(esc(`Last login: ${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${d.toTimeString().slice(0, 8)} ${d.getFullYear()} on tty2`));
      this.print('');
    }
    this.prompt();
    this.out.addEventListener('pointerup', () => { if (!String(getSelection() || '')) this.inp.focus({ preventScroll: true }); });
    this.inp.addEventListener('keydown', e => this.key(e));
    onCtx(this.out, e => Menu.show(e.clientX, e.clientY, [
      { label: 'Copy', icon: 'copy', kbd: 'Shift+Ctrl+C', disabled: !String(getSelection() || ''), action: () => copyText(String(getSelection()), 'Copied') },
      { label: 'Clear', icon: 'close', kbd: 'Ctrl+L', action: () => this.clear() },
      { sep: true },
      { label: 'New Window', icon: 'plus', action: () => Apps.launch('terminal', { cwd: this.cwd }) }
    ]));
    win.onFocus = () => this.inp.focus({ preventScroll: true });
    setTimeout(() => this.inp.focus({ preventScroll: true }), 60);
    if (run) setTimeout(() => this.submit(run), 120);
  }
  psHtml() { return `<span class="c-a bo">naji@nj-01</span>:<span class="c-b bo">${esc(FS.short(this.cwd))}</span>$ `; }
  prompt() { this.ps.innerHTML = this.psHtml(); WM.setTitle(this.win, `naji@nj-01: ${FS.short(this.cwd)}`); }
  print(html) { this.out.insertBefore(el('div.ln', { html: html === '' ? '&#8203;' : html }), this.row); this.out.scrollTop = this.out.scrollHeight; }
  text(t, cls) { this.print(cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t)); }
  err(t) { this.text(t); }
  clear() { $$('.ln', this.out).forEach(n => n.remove()); }
  key(e) {
    if (this.pending) {
      if (e.key === 'Enter') { e.preventDefault(); const v = this.inp.value, cb = this.pending; this.pending = null; this.inp.type = 'text'; this.inp.value = ''; this.print(esc(this.ps.textContent)); cb(v); if (!this.busy && !this.pending) this.prompt(); }
      else if (e.key === 'c' && e.ctrlKey) { e.preventDefault(); this.pending = null; this.inp.type = 'text'; this.inp.value = ''; this.print(esc(this.ps.textContent) + '^C'); this.prompt(); }
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); if (this.busy) return; const v = this.inp.value; this.inp.value = ''; this.submit(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (this.hi > 0) { this.hi--; this.inp.value = TermHistory[this.hi] || ''; this.caretEnd(); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (this.hi < TermHistory.length) { this.hi++; this.inp.value = TermHistory[this.hi] || ''; this.caretEnd(); } }
    else if (e.key === 'Tab') { e.preventDefault(); this.complete(); }
    else if (e.key.toLowerCase() === 'l' && e.ctrlKey) { e.preventDefault(); this.clear(); }
    else if (e.key.toLowerCase() === 'c' && e.ctrlKey && !String(getSelection() || '')) {
      e.preventDefault();
      if (this.busy) { this.busy(); this.busy = null; this.text('^C'); this.prompt(); }
      else { this.print(this.psHtml() + esc(this.inp.value) + '^C'); this.inp.value = ''; }
    }
  }
  caretEnd() { requestAnimationFrame(() => { const n = this.inp.value.length; this.inp.setSelectionRange(n, n); }); }
  submit(line) {
    this.print(this.psHtml() + esc(line));
    if (line.trim()) { if (TermHistory[TermHistory.length - 1] !== line) TermHistory.push(line); }
    this.hi = TermHistory.length;
    try { this.run(line); } catch (err) { console.error(err); this.text(`bash: ${err.message}`); }
    if (!this.win.closed && !this.busy && !this.pending) this.prompt();
  }
  wait(fn) { this.ps.innerHTML = ''; this.inp.readOnly = true; let cancelled = false; this.busy = () => { cancelled = true; this.inp.readOnly = false; }; fn(() => cancelled, () => { if (cancelled) return; this.busy = null; this.inp.readOnly = false; this.prompt(); this.inp.focus({ preventScroll: true }); }); }
  ask(promptText, secret, cb) { this.ps.textContent = promptText; this.inp.type = secret ? 'password' : 'text'; this.pending = cb; }
  expand(line) { return line.replace(/\$HOME|\$\{HOME\}/g, HOME).replace(/\$USER/g, 'naji').replace(/\$SHELL/g, '/bin/bash').replace(/\$PWD/g, this.cwd).replace(/\$HOSTNAME/g, 'nj-01').replace(/(^|\s)~(?=\/|\s|$)/g, '$1' + HOME); }
  run(line, root) {
    line = line.trim(); if (!line) return;
    if (line.includes('|')) { this.text('bash: pipes are not supported by this shell build'); return; }
    if (/&&/.test(line)) { line.split('&&').forEach(p => this.run(p, root)); return; }
    let argv = tokenize(this.expand(line)); let cmd = argv.shift();
    if (this.aliases[cmd]) { const ex = tokenize(this.aliases[cmd]); cmd = ex.shift(); argv = ex.concat(argv); }
    const f = TERM[cmd];
    if (f) return f.call(this, argv, line, root);
    const suggest = { sl: 'sl', cmatrix: 'cmatrix', htop: 'htop', python: 'python3', node: 'nodejs', npm: 'npm', docker: 'docker.io', figlet: 'figlet', lolcat: 'lolcat', neovim: 'neovim', nvim: 'neovim', tmux: 'tmux' }[cmd];
    if (suggest) { this.print(esc(`Command '${cmd}' not found, but can be installed with:\n\nsudo apt install ${suggest}`)); return; }
    this.text(`${cmd}: command not found`);
  }
  complete() {
    const v = this.inp.value, pos = this.inp.selectionStart, before = v.slice(0, pos), after = v.slice(pos);
    const m = /(?:\\ |[^\s])*$/.exec(before), word = m ? m[0] : '', head = before.slice(0, before.length - word.length);
    let cands;
    if (!head.trim()) cands = Object.keys(TERM).concat(Object.keys(this.aliases)).filter(c => c.startsWith(word)).sort().map(c => c + ' ');
    else {
      const w = word.replace(/\\ /g, ' '), slash = w.lastIndexOf('/'), dirPart = slash >= 0 ? w.slice(0, slash + 1) : '', base = w.slice(slash + 1);
      const dir = FS.get(FS.norm(dirPart || '.', this.cwd)); if (!dir || dir.type !== 'dir') return;
      cands = FS.list(dir, base.startsWith('.')).filter(n => n.name.startsWith(base)).map(n => (dirPart + n.name).replace(/ /g, '\\ ') + (n.type === 'dir' ? '/' : ' '));
    }
    if (!cands.length) return;
    if (cands.length === 1) { this.inp.value = head + cands[0] + after; }
    else {
      let pre = cands[0]; cands.forEach(c => { while (!c.startsWith(pre)) pre = pre.slice(0, -1); });
      if (pre.length > word.length) this.inp.value = head + pre + after;
      else { this.print(this.psHtml() + esc(v)); this.print(cands.map(c => esc(c.trim())).join('  ')); }
    }
    this.caretEnd();
  }
  colorName(n, label) {
    const nm = label || n.name, q = /\s/.test(nm) ? `'${nm}'` : nm;
    if (n.type === 'dir') return `<span class="c-b bo">${esc(q)}</span>`;
    if (n.type === 'app') return `<span class="c-g bo">${esc(q)}</span>`;
    if (n.kind === 'img') return `<span class="c-m bo">${esc(q)}</span>`;
    return esc(q);
  }
  resolve(arg) { const p = FS.norm(arg, this.cwd); return { p, n: FS.get(p) }; }
}

function lsLong(n) {
  const perm = n.type === 'dir' ? 'drwxr-xr-x' : n.type === 'app' ? '-rwxr-xr-x' : '-rw-r--r--';
  const size = n.type === 'dir' ? 4096 : FS.size(n);
  return `${perm} ${n.type === 'dir' ? 2 : 1} naji naji ${String(size).padStart(8)} ${fmtStamp(n.mtime)} `;
}
function wrapText(t, w) { const out = []; let line = ''; t.split(' ').forEach(word => { if ((line + ' ' + word).trim().length > w) { out.push(line.trim()); line = word; } else line += ' ' + word; }); if (line.trim()) out.push(line.trim()); return out; }

const TERM = {
  help() {
    const g = (t, cmds) => `<span class="c-a bo">${t.padEnd(12)}</span>${cmds}`;
    this.print(esc('LithOS bash, version 5.2.37(1)-release (x86_64-lithos-linux-gnu)\nThese shell commands are defined internally. Type a command and press Enter.\n'));
    this.print([
      g('Portfolio', 'about  projects  skills  experience  education  resume  contact  neofetch'),
      g('Files', 'ls  cd  pwd  cat  tree  open  mkdir  touch  rm  mv  echo  (with &gt; and &gt;&gt;)'),
      g('System', 'whoami  hostname  uname  date  uptime  history  clear  man  sudo  apt  exit'),
      g('Power', 'lock  logout  reboot  poweroff'),
      g('Apps', 'files  web  editor  settings  htop  calc  welcome'),
      g('Games', 'doom  race  solitaire  chess  2048  brickfall  mines  snake'),
      g('Fun', 'fortune  cowsay  ping  git log  man naji')
    ].join('\n'));
    this.print(esc('\nTab completes names. Up and down arrows walk through history. Ctrl+L clears the screen.'));
  },
  about() {
    this.print(`<span class="c-a bo">Naji Ullah</span> · Full-stack software engineer · Lahore, PK`);
    this.print(esc(`${ME.tagline}\n\nReact and Next.js on the front, Django and DRF behind them, and the Firebase,\nSalesforce and Zapier plumbing that keeps it all in step. Seven shipped projects.\n`));
    this.print(`<span class="c-d">Full read:</span> open ~/Desktop/README.md`);
  },
  projects() {
    PROJECTS.forEach(p => this.print(`<span class="c-d">${p.no}</span>  <span class="c-a bo">${esc(p.name.padEnd(27))}</span><span class="c-c">${esc(p.cat.padEnd(11))}</span>${esc(p.blurb.length > 70 ? p.blurb.slice(0, 68) + '…' : p.blurb)}`));
    this.print(`\n<span class="c-d">Read one:</span> cat ~/Projects/${PROJECTS[0].file}    <span class="c-d">Browse:</span> open ~/Projects`);
  },
  skills() {
    SKILLS.forEach(s => {
      this.print(`<span class="c-a bo">${esc(s.group)}</span> <span class="c-d">· ${esc(s.note)}</span>`);
      s.main.forEach(([name, tok]) => { const n = usedIn(tok).length; this.print(`  ${esc(name.padEnd(24))}<span class="c-a">${'█'.repeat(n * 3)}</span><span class="c-d">${'░'.repeat((7 - n) * 3)}</span>  ${n}/7 projects`); });
      this.print(`  <span class="c-d">also on hand:</span> ${esc(s.also.join(', '))}\n`);
    });
    this.print('<span class="c-d">Live view:</span> htop');
  },
  experience() {
    EXPERIENCE.forEach(e => {
      this.print(`<span class="c-a bo">${esc(e.role)} · ${esc(e.company)}</span>  <span class="c-d">${esc(e.dates)}</span>`);
      this.print(esc('  ' + e.summary));
      e.bullets.forEach(b => this.print(esc('  - ' + b)));
      this.print('');
    });
  },
  education() { this.print(`<span class="c-a bo">BS Software Engineering</span> · COMSATS University, Lahore  <span class="c-d">2024 – present</span>`); this.text('  Studying it by night, applying it by deadline.'); },
  resume() { this.text('Opening Resume.pdf in Document Viewer…', 'c-d'); openPath(HOME + '/Desktop/Resume.pdf'); },
  contact() {
    this.print(`<span class="c-a bo">email   </span> ${esc(ME.email)}`);
    this.print(`<span class="c-a bo">github  </span> <a href="${ME.github}" target="_blank" rel="noopener">${ME.github}</a>`);
    this.print(`<span class="c-a bo">linkedin</span> <a href="${ME.linkedin}" target="_blank" rel="noopener">${ME.linkedin}</a>`);
    this.print(`<span class="c-a bo">website </span> <a href="${ME.site}" target="_blank" rel="noopener">${ME.site}</a>`);
    this.print(`<span class="c-g">●</span> Available for interesting work.`);
  },
  neofetch() {
    const logo = [
      ['b1', '    .-~~~~~~~~~~-.    '], ['b1', '   (  ~~~~~~~~~~  )   '], ['b1', "   |'-.________.-'|   "], ['b2', '   |~~~~~~~~~~~~~~|   '],
      ['b2', '   |::::::::::::::|   '], ['b3', '   |##############|   '], ['b3', '   |~~~~~~~~~~~~~~|   '], ['b4', '   |==============|   '],
      ['b4', '   |::::::::::::::|   '], ['b4', "    '-.________.-'    "], ['', '                      '], ['', '                      '], ['', '                      '],
      ['', '                      '], ['', '                      '], ['', '                      '], ['', '                      ']
    ];
    const k = (a, b) => `<span class="c-a bo">${a}</span>: ${esc(b)}`;
    const info = [
      '<span class="c-a bo">naji</span>@<span class="c-a bo">nj-01</span>', '<span class="c-d">-----------</span>',
      k('OS', 'LithOS 26.09 (Overburden) x86_64'), k('Host', 'NJ-01 Borehole Workstation'), k('Kernel', '6.18.4-nj'), k('Uptime', uptimeStr()),
      k('Packages', `${PROJECTS.length} projects, ${PROCS.length} skills (dpkg)`), k('Shell', 'bash 5.2.37'), k('Resolution', `${window.innerWidth}x${window.innerHeight}`),
      k('DE', 'Strata 6.2 (Wayland)'), k('Theme', `${effMode() === 'night' ? 'Night shift' : 'Day shift'} [${(ACCENTS[Prefs.accent] || ACCENTS.amber).name}]`),
      k('Terminal', 'strata-term'), k('CPU', 'Naji Ullah (2) @ day + night'), k('Memory', `${PROJECTS.length} projects / 16 GiB`), k('Location', 'Lahore, PK (UTC+5)'),
      k('Status', 'Available for interesting work'),
      ['#1d1a18', '#c9443a', '#77c97a', '#eaa53e', '#4a95dc', '#b7a1f2', '#6fd3d0', '#f0eae3'].map(c => `<span class="blk" style="background:${c}"></span>`).join('')
    ];
    this.print(logo.map((l, i) => `<span class="${l[0]}">${esc(l[1])}</span> ${info[i] || ''}`).join('\n'));
  },
  ls(args) {
    const flags = args.filter(a => /^-/.test(a)).join(''), all = /a/.test(flags), long = /l/.test(flags);
    let targets = args.filter(a => !/^-/.test(a)); if (!targets.length) targets = ['.'];
    targets.forEach((t, ti) => {
      const { n } = this.resolve(t);
      if (!n) { this.text(`ls: cannot access '${t}': No such file or directory`); return; }
      if (targets.length > 1 && n.type === 'dir') this.text((ti ? '\n' : '') + t + ':');
      const list = n.type === 'dir' ? FS.list(n, all) : [n];
      if (long) {
        if (n.type === 'dir') this.text('total ' + list.length * 4);
        if (all && n.type === 'dir') { this.print(esc(lsLong(n)) + '<span class="c-b bo">.</span>'); this.print(esc(lsLong(n.parent || n)) + '<span class="c-b bo">..</span>'); }
        list.forEach(x => this.print(esc(lsLong(x)) + this.colorName(x)));
      } else {
        const names = (all && n.type === 'dir' ? ['<span class="c-b bo">.</span>', '<span class="c-b bo">..</span>'] : []).concat(list.map(x => this.colorName(x)));
        if (names.length) this.print(names.join('  '));
      }
    });
  },
  cd(args) {
    let t = args[0];
    if (!t || t === '~') t = HOME;
    if (t === '-') { t = this.oldpwd || this.cwd; this.text(t); }
    const { p, n } = this.resolve(t);
    if (!n) return this.text(`bash: cd: ${args[0]}: No such file or directory`);
    if (n.type !== 'dir') return this.text(`bash: cd: ${args[0]}: Not a directory`);
    this.oldpwd = this.cwd; this.cwd = p;
  },
  pwd() { this.text(this.cwd); },
  cat(args) {
    if (!args.length) return this.text('cat: missing file operand');
    args.forEach(a => {
      const { n } = this.resolve(a);
      if (!n) return this.text(`cat: ${a}: No such file or directory`);
      if (n.type === 'dir') return this.text(`cat: ${a}: Is a directory`);
      if (n.type === 'app') return this.text(`[Desktop Entry]\nType=Application\nName=${nodeLabel(n)}\nExec=${n.app}${n.args && n.args.path ? ' ' + n.args.path : ''}\nIcon=${nodeIcon(n)}\nTerminal=false`);
      if (n.kind || n.bin) { this.print(`<span class="c-d">${esc(n.kind === 'resume' ? '%PDF-1.7\n%âãÏÓ\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj' : '\u0089PNG\n\u001a\n\u0000\u0000\u0000\rIHDR\u0000\u0000\u0006@')}</span>`); this.text(`(binary file; try: open ${a})`, 'c-y'); return; }
      this.text(String(n.content).replace(/\n$/, ''));
    });
  },
  tree(args) {
    const t = args.find(a => !/^-/.test(a)) || '.', { n } = this.resolve(t);
    if (!n || n.type !== 'dir') return this.text(`${t} [error opening dir]`);
    const lines = [`<span class="c-b bo">${esc(t)}</span>`]; let dirs = 0, files = 0;
    const walk = (node, pre, depth) => {
      const kids = FS.list(node, false);
      kids.forEach((k, i) => {
        const last = i === kids.length - 1;
        lines.push(esc(pre + (last ? '└── ' : '├── ')) + this.colorName(k));
        if (k.type === 'dir') { dirs++; if (depth < 3) walk(k, pre + (last ? '    ' : '│   '), depth + 1); } else files++;
      });
    };
    walk(n, '', 1);
    lines.push('', `${dirs} directories, ${files} files`);
    this.print(lines.join('\n'));
  },
  open(args) {
    if (!args.length) return this.text('usage: open <file or folder>');
    args.forEach(a => { const { p, n } = this.resolve(a); if (!n) this.text(`open: ${a}: No such file or directory`); else openNode(n, p); });
  },
  mkdir(args) {
    const names = args.filter(a => !/^-/.test(a)), parents = args.includes('-p');
    if (!names.length) return this.text('mkdir: missing operand');
    names.forEach(a => {
      const p = FS.norm(a, this.cwd);
      if (FS.get(p)) { if (!parents) this.text(`mkdir: cannot create directory '${a}': File exists`); return; }
      const segs = p.split('/').filter(Boolean); let cur = FS.root;
      for (let i = 0; i < segs.length; i++) {
        let nx = cur.children[segs[i]];
        if (!nx) { if (i < segs.length - 1 && !parents) { this.text(`mkdir: cannot create directory '${a}': No such file or directory`); return; } nx = FS.add(cur, segs[i], D()); }
        if (nx.type !== 'dir') { this.text(`mkdir: cannot create directory '${a}': Not a directory`); return; }
        cur = nx;
      }
    });
  },
  touch(args) {
    if (!args.length) return this.text('touch: missing file operand');
    args.forEach(a => { const { p, n } = this.resolve(a); if (n) { n.mtime = Date.now(); return; } const dir = FS.get(FS.dir(p)); if (!dir || dir.type !== 'dir') return this.text(`touch: cannot touch '${a}': No such file or directory`); FS.add(dir, FS.base(p), F('')); });
  },
  rm(args, line, root) {
    const flags = args.filter(a => /^-/.test(a)).join(''), rec = /r|R/.test(flags), force = /f/.test(flags);
    const targets = args.filter(a => !/^-/.test(a));
    if (!targets.length) return this.text('rm: missing operand');
    targets.forEach(a => {
      const { p, n } = this.resolve(a);
      if (p === '/' || a === '/*') { this.text("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe"); return; }
      if (!n) { if (!force) this.text(`rm: cannot remove '${a}': No such file or directory`); return; }
      if (n.type === 'dir' && !rec) { this.text(`rm: cannot remove '${a}': Is a directory`); return; }
      if (!p.startsWith(HOME + '/') && !root) { this.text(`rm: cannot remove '${a}': Permission denied`); return; }
      if (FS.isAncestor(n, FS.get(this.cwd))) this.cwd = FS.path(n.parent);
      FS.remove(n);
    });
  },
  mv(args) {
    const t = args.filter(a => !/^-/.test(a));
    if (t.length < 2) return this.text('mv: missing destination file operand');
    const src = this.resolve(t[0]), dst = this.resolve(t[1]);
    if (!src.n) return this.text(`mv: cannot stat '${t[0]}': No such file or directory`);
    if (dst.n && dst.n.type === 'dir') { if (dst.n.children[src.n.name]) return this.text(`mv: '${t[1]}/${src.n.name}' already exists`); if (FS.isAncestor(src.n, dst.n)) return this.text(`mv: cannot move '${t[0]}' to a subdirectory of itself`); FS.move(src.n, dst.n); return; }
    const dir = FS.get(FS.dir(dst.p)); if (!dir || dir.type !== 'dir') return this.text(`mv: cannot move '${t[0]}' to '${t[1]}': No such file or directory`);
    if (dir === src.n.parent) FS.rename(src.n, FS.base(dst.p)); else FS.move(src.n, dir, FS.base(dst.p));
  },
  echo(args, line) {
    const m = /^\s*echo\s+(.*?)\s*(>>?)\s*(\S+)\s*$/.exec(this.expand(line));
    if (m) {
      const text = tokenize(m[1]).join(' '), p = FS.norm(m[3], this.cwd), n = FS.get(p);
      if (n && n.type !== 'file') return this.text(`bash: ${m[3]}: Is a directory`);
      if (n && (n.kind || n.bin)) return this.text(`bash: ${m[3]}: Permission denied`);
      if (!FS.write(p, (m[2] === '>>' && n ? String(n.content) : '') + text + '\n')) this.text(`bash: ${m[3]}: No such file or directory`);
      return;
    }
    this.text(args.join(' '));
  },
  whoami() { this.text('naji'); },
  hostname() { this.text('nj-01'); },
  uname(args) { this.text(args.includes('-a') ? 'Linux nj-01 6.18.4-nj #1 SMP PREEMPT_DYNAMIC Sat Jul 18 02:26:00 PKT 2026 x86_64 GNU/Linux' : args.includes('-r') ? '6.18.4-nj' : 'Linux'); },
  date() { this.text(new Date().toString().replace(/\s\(.+\)$/, '')); },
  uptime() { const d = new Date(); this.text(` ${d.toTimeString().slice(0, 8)} up ${uptimeStr()},  1 user,  load average: 0.42, 0.37, 0.31`); },
  history() { this.print(TermHistory.map((h, i) => `${String(i + 1).padStart(5)}  ${esc(h)}`).join('\n')); },
  clear() { this.clear(); },
  man(args) {
    if (args[0] === 'naji') {
      this.print(esc(`NAJI(1)                     User Commands                     NAJI(1)

NAME
       naji - full-stack software engineer, Lahore

SYNOPSIS
       naji [--ship-by-day] [--study-by-night] [--stack react,next,django]

DESCRIPTION
       Builds responsive front ends in React and Next.js, the Django and DRF
       behind them, and the Firebase, Salesforce and Zapier plumbing that
       keeps everything in step. Has shipped seven projects.

OPTIONS
       --ship-by-day      default
       --study-by-night   BS Software Engineering, COMSATS University Lahore

BUGS
       Treats redundant API calls personally.

SEE ALSO
       projects(1), skills(1), contact(1), https://naji.codes/

LithOS 26.09                     September 2026                     NAJI(1)`));
      return;
    }
    if (!args.length) return this.text('What manual page do you want?\nFor example, try \'man naji\'.');
    this.text(`No manual entry for ${args[0]}`);
  },
  exit() { const w = this.win; setTimeout(() => WM.close(w), 30); },
  logout() { Power.logout(true); },
  lock() { Power.lock(); },
  reboot() { this.text('Broadcast message from naji@nj-01: The system will reboot now!', 'c-y'); setTimeout(() => Power.restart(), 700); },
  poweroff() { this.text('Broadcast message from naji@nj-01: The system will power off now!', 'c-y'); setTimeout(() => Power.shutdown(), 700); },
  shutdown(args) { TERM.poweroff.call(this, args); },
  fortune() { this.print(esc(wrapText(FORTUNES[Math.floor(Math.random() * FORTUNES.length)], 66).join('\n'))); this.text('                -- Naji Ullah', 'c-d'); },
  cowsay(args) {
    const t = args.join(' ') || FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const lines = wrapText(t, 38), w = Math.max(...lines.map(l => l.length));
    const bub = lines.length === 1 ? [`< ${lines[0]} >`] : lines.map((l, i) => `${i === 0 ? '/' : i === lines.length - 1 ? '\\' : '|'} ${l.padEnd(w)} ${i === 0 ? '\\' : i === lines.length - 1 ? '/' : '|'}`);
    this.text([' ' + '_'.repeat(w + 2), ...bub, ' ' + '-'.repeat(w + 2), '        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'].join('\n'));
  },
  ping(args) {
    const host = args.filter(a => !/^-/.test(a))[0];
    if (!host) return this.text('ping: usage error: Destination address required');
    if (!Sys.wifi) return this.text(`ping: ${host}: Temporary failure in name resolution`);
    const ip = host === 'naji.codes' ? '76.76.21.21' : `${104 + host.length % 50}.${21 + host.length}.${host.charCodeAt(0) % 200}.${host.length * 7 % 250}`;
    this.text(`PING ${host} (${ip}) 56(84) bytes of data.`);
    const times = [];
    this.wait((cancelled, done) => {
      let i = 0;
      const step = () => {
        if (cancelled()) return;
        if (i >= 4) { const mn = Math.min(...times), mx = Math.max(...times), av = times.reduce((a, b) => a + b, 0) / times.length; this.text(`\n--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss, time 3004ms\nrtt min/avg/max/mdev = ${mn.toFixed(3)}/${av.toFixed(3)}/${mx.toFixed(3)}/${((mx - mn) / 3).toFixed(3)} ms`); done(); return; }
        const t = 28 + Math.random() * 22; times.push(t); i++;
        this.text(`64 bytes from ${ip}: icmp_seq=${i} ttl=57 time=${t.toFixed(1)} ms`);
        setTimeout(step, 700);
      };
      setTimeout(step, 400);
    });
  },
  apt(args, line, root) {
    const sub = args[0], pk = args.slice(1).filter(a => !/^-/.test(a));
    if (sub === 'list' && args.includes('--installed')) {
      this.text('Listing... Done');
      PROCS.forEach(p => this.print(`<span class="c-g">${esc(p[0])}</span>/overburden,now ${usedIn(p[3]).length}.${p[0].length} amd64 [installed]`));
      return;
    }
    if (sub !== 'install' && sub !== 'update' && sub !== 'upgrade') return this.text('apt 2.9.8 (amd64)\nUsage: apt [options] command\n\nMost used commands:\n  list - list packages based on package names\n  install - install packages\n  update - update list of available packages\n  upgrade - upgrade the system by installing/upgrading packages');
    if (!root) return this.text('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?');
    if (sub === 'update') { this.text('Hit:1 https://naji.codes overburden InRelease\nReading package lists... Done\nAll packages are up to date.'); return; }
    if (sub === 'upgrade') { this.text('Reading package lists... Done\nCalculating upgrade... Done\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.'); return; }
    if (!pk.length) return this.text('E: No packages specified for install');
    pk.forEach(name => {
      const hit = PROCS.find(p => p[0] === name.toLowerCase() || p[1].toLowerCase() === name.toLowerCase());
      this.text('Reading package lists... Done\nBuilding dependency tree... Done');
      if (hit) { const n = usedIn(hit[3]).length; this.text(`${hit[0]} is already the newest version (${n ? `used in ${n} of 7 projects` : 'on hand'}).\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`); }
      else this.text(`E: Unable to locate package ${name}`);
    });
  },
  'apt-get'(a, l, r) { TERM.apt.call(this, a, l, r); },
  sudo(args, line) {
    if (!args.length) return this.text('usage: sudo command');
    const rest = line.replace(/^\s*sudo\s+/, '');
    const go = () => this.run(rest, true);
    if (this.sudoUntil && Date.now() < this.sudoUntil) { go(); return; }
    this.ask('[sudo] password for naji: ', true, () => { this.sudoUntil = Date.now() + 5 * 60000; go(); });
  },
  git(args) {
    if (args[0] === 'log') {
      const commits = [
        ['a91f3c2', 'HEAD -> main, origin/main', 'Jul 2026', 'struMLines: mobile apps, web apps and automations across platforms'],
        ['7d20e4b', '', 'Jun 2026', 'Devflovv: React/Next.js front ends, Django + DRF back ends'],
        ['3c6b1a0', '', 'Feb 2025', 'Start drilling: first professional role'],
        ['0e11d57', '', 'Sep 2024', 'Initial commit: BS Software Engineering, COMSATS Lahore']
      ];
      if (args.includes('--oneline')) { commits.forEach(c => this.print(`<span class="c-y">${c[0]}</span> ${c[1] ? `<span class="c-c">(${esc(c[1])})</span> ` : ''}${esc(c[3])}`)); return; }
      commits.forEach(c => this.print(`<span class="c-y">commit ${c[0]}${'0'.repeat(33)}</span>${c[1] ? ` <span class="c-c">(${esc(c[1])})</span>` : ''}\nAuthor: Naji Ullah &lt;${esc(ME.email)}&gt;\nDate:   ${c[2]}\n\n    ${esc(c[3])}\n`));
      return;
    }
    if (args[0] === 'status') return this.text('On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean');
    if (args[0] === 'push') return this.text('Everything up-to-date');
    if (!args.length) return this.text('usage: git [--version] [--help] <command> [<args>]');
    this.text(`git: '${args[0]}' is not a git command. See 'git --help'.`);
  },
  curl(args) { const h = (args.find(a => !/^-/.test(a)) || '').replace(/^https?:\/\//, '').split('/')[0]; this.text(h ? `curl: (6) Could not resolve host: ${h}` : "curl: try 'curl --help' for more information"); },
  wget(args) { TERM.curl.call(this, args); },
  files(args) { Apps.launch('files', { path: args[0] ? FS.norm(args[0], this.cwd) : this.cwd }); },
  nautilus(a) { TERM.files.call(this, a); },
  web(args) { Apps.launch('web', { url: args[0] }); },
  firefox(a) { TERM.web.call(this, a); },
  editor(args) {
    if (!args[0]) { Apps.launch('editor'); return; }
    const p = FS.norm(args[0], this.cwd), n = FS.get(p);
    if (n && n.type === 'dir') return this.text(`${args[0]}: Is a directory`);
    if (!n) { const dir = FS.get(FS.dir(p)); if (!dir) return this.text(`${args[0]}: No such file or directory`); FS.add(dir, FS.base(p), F('')); }
    Apps.launch('editor', { path: p, edit: true });
  },
  nano(a) { TERM.editor.call(this, a); }, vim(a) { TERM.editor.call(this, a); }, vi(a) { TERM.editor.call(this, a); }, code(a) { TERM.editor.call(this, a); }, gedit(a) { TERM.editor.call(this, a); },
  settings() { Apps.launch('settings'); },
  htop() { Apps.launch('monitor', { tab: 'processes' }); }, top() { Apps.launch('monitor', { tab: 'processes' }); },
  calc() { Apps.launch('calc'); }, mines() { Apps.launch('mines'); }, snake() { Apps.launch('snake'); }, welcome() { Apps.launch('welcome'); },
  doom() { this.text('Starting DOOM (shareware v1.10)…', 'c-d'); Apps.launch('doom'); }, race() { Apps.launch('racer'); }, canalrun() { Apps.launch('racer'); },
  solitaire() { Apps.launch('solitaire'); }, chess() { Apps.launch('chess'); }, '2048'() { Apps.launch('2048'); }, brickfall() { Apps.launch('brickfall'); },
  games() { this.print(['doom', 'race', 'solitaire', 'chess', '2048', 'brickfall', 'mines', 'snake'].map(g => `<span class="c-g bo">${g}</span>`).join('  ')); }
};
