/* ================= boot, login, power ================= */
const Power = {
  state: 'off', fast: false, waiters: [], firstLogin: true, deskReady: false,
  wait(ms) { return new Promise(r => { if (this.fast) return r(); const t = setTimeout(r, ms); this.waiters.push({ t, r }); }); },
  skip() { if (this.fast) return; this.fast = true; this.waiters.forEach(w => { clearTimeout(w.t); w.r(); }); this.waiters = []; },
  screen(name) {
    ['boot', 'login', 'desk', 'off'].forEach(s => { const n = $('#scr-' + s); if (n) n.hidden = true; });
    if (name) name.split(' ').forEach(s => { $('#scr-' + s).hidden = false; });
  },
  async boot() {
    this.state = 'boot'; this.fast = false; this.waiters = [];
    Menu.hide(); Pop.close(); Launcher.hide();
    this.screen('boot');
    const grub = $('#grub'), klog = $('#klog'), splash = $('#splash'), hint = $('#skiphint');
    grub.hidden = true; klog.hidden = true; splash.hidden = true; hint.hidden = true; klog.innerHTML = '';
    await sleep(350);
    await this.grub(grub);
    grub.hidden = true;
    Sys.bootAt = Date.now();
    hint.hidden = false; klog.hidden = false;
    const line = (html) => { klog.append(el('div', { html })); while (klog.children.length > 80) klog.firstChild.remove(); };
    line('Loading Linux 6.18.4-nj ...'); await this.wait(180);
    line('Loading initial ramdisk ...'); await this.wait(220);
    klog.innerHTML = '';
    const R = mulberry(5); let ts = 0;
    const dm = [
      'Linux version 6.18.4-nj (naji@nj-01) (gcc (GCC) 14.2.1, GNU ld 2.43) #1 SMP PREEMPT_DYNAMIC',
      'Command line: BOOT_IMAGE=/boot/vmlinuz-6.18.4-nj root=UUID=7e1c-nj01 ro quiet splash',
      'BIOS-provided physical RAM map:', 'BIOS-e820: [mem 0x0000000000000000-0x000000000009ffff] usable',
      'NX (Execute Disable) protection: active', 'DMI: struMLines NJ-01/Borehole Workstation, BIOS 2.6 02/2025',
      'tsc: Detected 3600.000 MHz processor', 'Memory: 16277588K/16648528K available (18432K kernel code)',
      'smpboot: CPU0: Naji Ullah (family: 0x6, model: 0x26, threads: day, night)', 'rcu: Hierarchical RCU implementation.',
      'ACPI: Added _OSI(Linux)', 'PCI: Using configuration type 1 for base access', 'pci 0000:00:02.0: vgaarb: setting as boot VGA device',
      'nvme nvme0: 16/0/0 default/read/poll queues', ' nvme0n1: p1 p2 p3', 'usb 1-1: new high-speed USB device number 2 using xhci_hcd',
      'input: Keyboard (EN) as /devices/platform/i8042/serio0/input/input3', 'EXT4-fs (nvme0n1p2): mounted filesystem with ordered data mode',
      'random: crng init done', 'systemd[1]: systemd 256 running in system mode', 'systemd[1]: Hostname set to <nj-01>.'
    ];
    for (const d of dm) { ts += 0.03 + R() * 0.18; line(`<span class="k-dim">[${ts.toFixed(6).padStart(12)}]</span> ${esc(d)}`); await this.wait(12 + R() * 22); }
    line(''); line(`Welcome to <span class="k-hl">LithOS 26.09 (Overburden)</span>!`); line(''); await this.wait(120);
    for (const [k, t] of SYSTEMD_UNITS) {
      const tag = k === 'ok' ? '[<span class="k-ok">  OK  </span>]' : k === 'fail' ? '[<span class="k-fail">FAILED</span>]' : '        ';
      line(`${tag} ${esc(t)}`); await this.wait(35 + R() * 55);
    }
    await this.wait(180);
    klog.hidden = true; splash.hidden = false;
    splash.innerHTML = '';
    splash.append(el('div.splash-in', {}, el('span', { html: icon('logo') }), el('div.splash-word', { html: 'Lith<b>OS</b>' }), el('div.dots', { html: '<i></i><i></i><i></i><i></i><i></i>' })));
    await this.wait(900);
    hint.hidden = true;
    this.toLogin();
  },
  grub(box) {
    return new Promise(resolve => {
      const main = ['LithOS GNU/Linux', 'Advanced options for LithOS GNU/Linux', 'Memory test (memtest86+x64.efi)', 'UEFI Firmware Settings'];
      const adv = ['LithOS GNU/Linux, with Linux 6.18.4-nj', 'LithOS GNU/Linux, with Linux 6.18.4-nj (recovery mode)', 'LithOS GNU/Linux, with Linux 6.12.9-nj', 'LithOS GNU/Linux, with Linux 6.12.9-nj (recovery mode)'];
      let items = main, sel = 0, t = 3, counting = true, msg = null, sub = false;
      box.hidden = false;
      const draw = () => {
        box.innerHTML = '';
        box.append(el('div.grub-title', { text: 'GNU GRUB  version 2.12' }));
        if (msg) { box.append(el('div.grub-help', { text: msg, style: { marginTop: '4vh' } })); return; }
        const b = el('div.grub-box', { role: 'listbox', 'aria-label': 'Boot menu' });
        items.forEach((it, i) => {
          const n = el('div.grub-item' + (i === sel ? '.sel' : ''), { role: 'option', text: (i === sel ? '*' : ' ') + it });
          n.addEventListener('click', () => { if (sel === i) choose(); else { sel = i; stop(); draw(); } });
          n.addEventListener('pointerup', e => { if (e.pointerType === 'touch') { sel = i; choose(); } });
          b.append(n);
        });
        box.append(b);
        box.append(el('div.grub-help', { text: `      Use the ↑ and ↓ keys to select which entry is highlighted.\n      Press enter to boot the selected OS, \`e' to edit the commands\n      before booting or \`c' for a command-line.${sub ? ' ESC to return\n      previous menu.' : ''}${counting ? `\n   The highlighted entry will be executed automatically in ${t}s.` : ''}` }));
      };
      const stop = () => { counting = false; clearInterval(timer); };
      const finish = () => { stop(); document.removeEventListener('keydown', key, true); box.innerHTML = ''; resolve(); };
      const choose = () => {
        if (!sub && sel === 1) { sub = true; items = adv; sel = 0; stop(); draw(); return; }
        if (!sub && sel === 2) { msg = "error: ../../grub-core/loader/efi/linux.c: file `/boot/memtest86+x64.efi' not found.\n\nPress any key to continue..."; stop(); draw(); return; }
        if (!sub && sel === 3) { msg = 'System setup is locked on this machine.\n\nPress any key to continue...'; stop(); draw(); return; }
        finish();
      };
      const key = e => {
        if (this.state !== 'boot') return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (msg) { msg = null; draw(); return; }
        if (e.key === 'ArrowDown') { sel = (sel + 1) % items.length; stop(); draw(); }
        else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; stop(); draw(); }
        else if (e.key === 'Enter') choose();
        else if (e.key === 'Escape' && sub) { sub = false; items = main; sel = 1; draw(); }
        else if (e.key === 'Escape') finish();
        else stop(), draw();
      };
      box.onclick = () => { if (msg) { msg = null; draw(); } };
      document.addEventListener('keydown', key, true);
      const timer = setInterval(() => { if (!counting) return; t--; if (t <= 0) finish(); else draw(); }, 1000);
      draw();
    });
  },
  toLogin() {
    this.state = 'login';
    Wall.render();
    this.screen('login');
    this.loginBg();
    const L = $('#scr-login'); L.classList.remove('leave'); L.classList.add('show');
    const p = $('#lg-pass'); p.value = 'nightshift'; $('#lg-hint').textContent = this.locked ? 'Locked. Press Enter to unlock' : 'Press Enter to sign in';
    $('#lg-go').innerHTML = li('fwd');
    this.tickLogin();
    setTimeout(() => { if (!isPhone()) p.focus(); }, 80);
  },
  tickLogin() {
    const d = new Date(), t = fmtTime(d), key = t + Sys.wifi + (Prefs.volume > 0);
    if (this._lk === key) return; this._lk = key;
    $('#lg-clock').textContent = t; $('#lg-date').textContent = fmtDateLong(d);
    $('#lg-net').innerHTML = li(Sys.wifi ? 'wifi' : 'wifioff'); $('#lg-vol').innerHTML = li(Prefs.volume > 0 ? 'vol' : 'mute');
  },
  loginBg() {
    const src = $('#wall'), cv = $('#lg-bg');
    if (!src.width) { Wall.render(true); }
    const w = Math.max(24, Math.round(window.innerWidth / 10)), h = Math.max(24, Math.round(window.innerHeight / 10));
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    try { c.filter = 'blur(2.5px)'; } catch (e) { /* older engines: plain downscale still reads as blurred */ }
    c.drawImage(src, -4, -4, w + 8, h + 8);
    c.filter = 'none';
    c.fillStyle = 'rgba(12,10,9,.42)'; c.fillRect(0, 0, w, h);
  },
  async login() {
    if (this.state !== 'login' || this.signing) return;
    this.signing = true;
    Snd.ensure();
    $('#lg-go').innerHTML = '<span class="spin"></span>'; $('#lg-hint').textContent = this.locked ? 'Unlocking…' : 'Signing in…';
    await sleep(this.locked ? 150 : 350);
    this.signing = false;
    const L = $('#scr-login'); L.classList.remove('show'); L.classList.add('leave');
    if (!this.deskReady) { Panel.init(); Desk.init(); this.deskReady = true; }
    const wasLocked = this.locked; this.locked = false;
    $('#scr-desk').hidden = false; this.state = 'desktop';
    if (!wasLocked) { const D = $('#scr-desk'); D.classList.remove('enter'); void D.offsetWidth; D.classList.add('enter'); Desk.render(); Snd.play('login'); }
    setTimeout(() => { L.hidden = true; L.classList.remove('leave'); }, 340);
    if (!wasLocked && this.firstLogin) {
      this.firstLogin = false;
      if (Prefs.welcome) setTimeout(() => Apps.launch('welcome'), 450);
      setTimeout(() => Notif.push({ title: 'Available for interesting work', body: 'Naji is open to new roles and freelance projects.', icon: 'contact', actions: [{ label: 'Get in touch', primary: true, run: () => Apps.launch('contact') }] }), 2600);
    }
  },
  lock() { if (this.state !== 'desktop') return; this.locked = true; Menu.hide(); Pop.close(); Launcher.hide(); this.toLogin(); },
  async logout(sound) {
    if (this.state !== 'desktop') return;
    if (sound) Snd.play('logout');
    WM.closeAll(); Menu.hide(); Pop.close(); Launcher.hide();
    this.locked = false;
    await sleep(250);
    this.toLogin();
  },
  async ask(kind) {
    const ok = await Dialog.confirm(kind === 'off'
      ? { title: 'Shut down this system now?', text: 'Open windows will close. Anything you created in this session will be lost.', ok: 'Shut Down', danger: true }
      : { title: 'Restart this system now?', text: 'Open windows will close and the machine will boot again.', ok: 'Restart' });
    if (ok) kind === 'off' ? this.shutdown() : this.restart();
  },
  async shutdown(restart) {
    Snd.play('logout');
    WM.closeAll(); Menu.hide(); Pop.close(); Launcher.hide();
    this.state = 'halt';
    await sleep(300);
    this.screen('boot');
    $('#grub').hidden = true; $('#splash').hidden = true; $('#skiphint').hidden = true;
    const klog = $('#klog'); klog.innerHTML = ''; klog.hidden = false;
    const lines = ['Stopped target Graphical Interface.', 'Stopped Strata Display Manager.', 'Stopped Zapier Webhook Listener.', 'Stopped Salesforce Sync Daemon.', 'Stopped Firebase Emulator Suite.', 'Stopped PostgreSQL 16 database server.', 'Stopped Django Application Server (DRF).', 'Stopped React Development Server.', 'Unmounted /home/naji/Projects.', 'Unmounted /home/naji.', `Reached target System ${restart ? 'Reboot' : 'Power Off'}.`];
    for (const l of lines) { klog.append(el('div', { html: `[<span class="k-ok">  OK  </span>] ${esc(l)}` })); await sleep(90); }
    const up = ((Date.now() - Sys.bootAt) / 1000).toFixed(6);
    klog.append(el('div', { html: `<span class="k-dim">[${up.padStart(12)}]</span> reboot: ${restart ? 'Restarting system' : 'Power down'}` }));
    await sleep(700);
    klog.hidden = true;
    if (restart) { this.screen('off'); $('#scr-off').firstElementChild.hidden = true; await sleep(700); $('#scr-off').firstElementChild.hidden = false; this.firstLogin = true; this.boot(); return; }
    this.state = 'off';
    this.screen('off');
  },
  restart() { this.shutdown(true); }
};

/* ================= global wiring ================= */
function init() {
  Safe.measure();
  FS.init();
  applyTheme();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (Prefs.mode === 'auto') applyTheme(); }); } catch (e) { /* old browsers */ }
  new MutationObserver(() => { if (Prefs.mode === 'auto') applyTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  Bus.on('theme', () => { if (Prefs.wall === 'auto') Wall.render(true); });

  $('#lg-pass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); Power.login(); } });
  $('#lg-go').addEventListener('click', () => Power.login());
  $('#lg-restart').innerHTML = li('restart') + '<span>Restart</span>';
  $('#lg-off').innerHTML = li('power') + '<span>Shut Down</span>';
  $('#lg-restart').addEventListener('click', () => Power.restart());
  $('#lg-off').addEventListener('click', () => Power.shutdown());
  $('#power-on').innerHTML = li('power');
  $('#power-on').addEventListener('click', () => Power.boot());
  setInterval(() => { if (Power.state === 'login') Power.tickLogin(); }, 1000);

  const bootScr = $('#scr-boot');
  document.addEventListener('keydown', e => { if (Power.state === 'boot' && $('#grub').hidden && e.key === 'Escape') Power.skip(); });
  bootScr.addEventListener('pointerdown', () => { if (Power.state === 'boot' && $('#grub').hidden) Power.skip(); });

  let metaAlone = false;
  document.addEventListener('keydown', e => {
    if (Power.state !== 'desktop') return;
    metaAlone = e.key === 'Meta' || e.key === 'OS';
    if (e.key === 'Escape') { Menu.hide(); Pop.close(); Launcher.hide(); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') { e.preventDefault(); Apps.launch('terminal'); }
    if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'w' && WM.active && !e.shiftKey) { e.preventDefault(); WM.close(WM.active); }
    if (e.altKey && e.key === 'F1') { e.preventDefault(); Launcher.toggle(); }
  });
  document.addEventListener('keyup', e => { if (Power.state === 'desktop' && (e.key === 'Meta' || e.key === 'OS') && metaAlone) Launcher.toggle(); metaAlone = false; });

  $('#os').addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea,.md-in,.pdf-page,.wpage')) e.preventDefault(); });

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { Safe.measure(); Wall.render(); if (Power.deskReady) { WM.fit(); Desk.render(); } Menu.hide(); }, 160);
  });
  window.addEventListener('blur', () => {
    Menu.hide();
    setTimeout(() => {
      const a = document.activeElement;
      if (a && a.tagName === 'IFRAME') { Pop.close(); Launcher.hide(); const w = WM.wins.find(x => x.el.contains(a)); if (w && WM.active !== w) WM.focus(w); }
    }, 0);
  });

  if (location.hash === '#desktop') Wall.render(true); else setTimeout(() => Wall.render(true), 60);
  if (location.hash === '#desktop') { Sys.bootAt = Date.now() - 1000 * 60 * 3; Power.state = 'login'; Power.screen('login'); Power.login(); }
  else Power.boot();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
