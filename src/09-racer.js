/* ================= Canal Run: 3D night street racer (Three.js r128, loaded on demand) ================= */
Apps.def('racer', {
  name: 'Canal Run', icon: 'racer', single: true,
  open() {
    let T, renderer, scene, camera, raf = 0, alive = true, stage, ro, ov, hud = {}, audio = null;
    let state = 'loading', paused = false, keys = {}, camMode = 0, shake = 0, raceT = 0, countT = 0, lastT = 0;
    let P = [], TAN = [], SIDE = [], CURV = [], N = 0, SEG = 1, L = 0, player, ais = [], cars = [], mapBase = null, mapBounds = null, speedLines;
    const HW = 11, LAPS = 3;

    const fail = t => { ov.hidden = false; ov.innerHTML = ''; ov.append(el('div.rc-card', {}, el('b', { text: 'Canal Run couldn’t start' }), el('p', { text: t }))); };

    const tex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; };
    const glowTex = () => tex(64, 64, (c, w) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });

    function buildTrack() {
      const ctrl = [[0, 0], [170, -30], [320, 20], [390, 170], [330, 330], [190, 390], [110, 300], [10, 330], [-130, 400], [-240, 290], [-220, 130], [-130, 50]];
      const curve = new T.CatmullRomCurve3(ctrl.map(([x, z]) => new T.Vector3(x, 0, z)), true, 'centripetal');
      N = 900; L = curve.getLength(); SEG = L / N;
      P = curve.getSpacedPoints(N).slice(0, N);
      for (let i = 0; i < N; i++) {
        const a = P[(i + N - 1) % N], b = P[(i + 1) % N], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz);
        TAN[i] = [tx / l, tz / l]; SIDE[i] = [tz / l, -tx / l];
      }
      for (let i = 0; i < N; i++) { const a = TAN[(i + N - 8) % N], b = TAN[(i + 8) % N]; CURV[i] = Math.acos(clamp(a[0] * b[0] + a[1] * b[1], -1, 1)) / (16 * SEG); }
      // road surface
      const roadTex = tex(256, 512, (c, w, h) => {
        c.fillStyle = '#26262b'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 5000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.18)'; c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
        c.fillStyle = '#e8e4da'; c.fillRect(8, 0, 6, h); c.fillRect(w - 14, 0, 6, h);
        c.fillStyle = 'rgba(232,228,218,.85)'; [0.25, 0.5, 0.75].forEach(u => c.fillRect(u * w - 3, 0, 6, h * 0.45));
        c.fillStyle = '#d9a336'; c.fillRect(w / 2 - 10, 0, 3, h); c.fillRect(w / 2 + 7, 0, 3, h);
      });
      roadTex.wrapS = roadTex.wrapT = T.RepeatWrapping;
      const pos = [], uv = [], idx = [];
      let acc = 0;
      for (let i = 0; i <= N; i++) {
        const k = i % N, p = P[k], s = SIDE[k];
        pos.push(p.x - s[0] * HW, 0.02, p.z - s[1] * HW, p.x + s[0] * HW, 0.02, p.z + s[1] * HW);
        uv.push(0, acc / 22, 1, acc / 22); acc += SEG;
        if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); rg.setIndex(idx); rg.computeVertexNormals();
      scene.add(new T.Mesh(rg, new T.MeshPhongMaterial({ map: roadTex, shininess: 40, specular: 0x333333 })));
      // barriers with a reflective band on top
      const wall = (sign, h, y0, mat) => {
        const wp = [], wi = [];
        for (let i = 0; i <= N; i++) { const k = i % N, p = P[k], s = SIDE[k], o = sign * (HW + 0.7); wp.push(p.x + s[0] * o, y0, p.z + s[1] * o, p.x + s[0] * o, y0 + h, p.z + s[1] * o); if (i < N) { const a = i * 2; wi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(wp, 3)); g.setIndex(wi); g.computeVertexNormals();
        const m = new T.Mesh(g, mat); scene.add(m);
      };
      const concrete = new T.MeshLambertMaterial({ color: 0x4a4650, side: T.DoubleSide });
      [-1, 1].forEach(sg => { wall(sg, 1.0, 0, concrete); wall(sg, 0.12, 1.0, new T.MeshBasicMaterial({ color: sg < 0 ? 0xeaa53e : 0x49c6e5, side: T.DoubleSide })); });
      // canal along one stretch
      const water = [], wi2 = [];
      const c0 = 520, c1 = 820;
      for (let i = c0; i <= c1; i++) { const p = P[i % N], s = SIDE[i % N]; water.push(p.x + s[0] * (HW + 6), -0.4, p.z + s[1] * (HW + 6), p.x + s[0] * (HW + 30), -0.4, p.z + s[1] * (HW + 30)); if (i < c1) { const a = (i - c0) * 2; wi2.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(water, 3)); wg.setIndex(wi2); wg.computeVertexNormals();
      scene.add(new T.Mesh(wg, new T.MeshPhongMaterial({ color: 0x0b2630, shininess: 120, specular: 0x6fa3c0, side: T.DoubleSide })));
      // start gantry and grid line
      const sl = new T.Mesh(new T.PlaneGeometry(HW * 2, 3), new T.MeshBasicMaterial({ map: tex(128, 16, (c) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#eee'; c.fillRect(x * 8, y * 8, 8, 8); } }) }));
      sl.rotation.x = -Math.PI / 2; sl.rotation.z = Math.atan2(TAN[0][0], TAN[0][1]); sl.position.set(P[0].x, 0.04, P[0].z); scene.add(sl);
      const gantry = new T.Group(), gm = new T.MeshLambertMaterial({ color: 0x2a2830 });
      [-1, 1].forEach(sg => { const post = new T.Mesh(new T.BoxGeometry(0.6, 9, 0.6), gm); post.position.set(sg * (HW + 1.5), 4.5, 0); gantry.add(post); });
      const sign = new T.Mesh(new T.BoxGeometry(HW * 2 + 3.6, 1.8, 0.4), new T.MeshBasicMaterial({ map: tex(512, 48, (c, w, h) => { c.fillStyle = '#0e0c12'; c.fillRect(0, 0, w, h); c.fillStyle = '#eaa53e'; c.font = '800 30px "Red Hat Display",Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CANAL RUN · LAHORE', w / 2, h / 2 + 2); }) }));
      sign.position.set(0, 8.4, 0); gantry.add(sign);
      gantry.position.set(P[0].x, 0, P[0].z); gantry.rotation.y = Math.atan2(TAN[0][0], TAN[0][1]); scene.add(gantry);
      // street lamps: instanced poles, glowing heads, light pools on the asphalt
      const lampIdx = []; for (let i = 6; i < N; i += 16) lampIdx.push([i, (i / 16) % 2 ? 1 : -1]);
      const poleM = new T.InstancedMesh(new T.BoxGeometry(0.25, 9, 0.25), new T.MeshLambertMaterial({ color: 0x33303a }), lampIdx.length);
      const poolM = new T.InstancedMesh(new T.PlaneGeometry(16, 16), new T.MeshBasicMaterial({ map: glowTex(), color: 0xffb35c, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending }), lampIdx.length);
      const headPos = [], m4 = new T.Matrix4(), q = new T.Quaternion(), flat = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0));
      lampIdx.forEach(([i, sg], n) => {
        const p = P[i], s = SIDE[i], o = sg * (HW + 1.6);
        m4.compose(new T.Vector3(p.x + s[0] * o, 4.5, p.z + s[1] * o), q, new T.Vector3(1, 1, 1)); poleM.setMatrixAt(n, m4);
        const hx = p.x + s[0] * sg * (HW + 0.9), hz = p.z + s[1] * sg * (HW + 0.9);
        headPos.push(hx, 9.1, hz);
        m4.compose(new T.Vector3(p.x + s[0] * sg * (HW - 3), 0.05, p.z + s[1] * sg * (HW - 3)), flat, new T.Vector3(1, 1, 1)); poolM.setMatrixAt(n, m4);
      });
      scene.add(poleM, poolM);
      const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(headPos, 3));
      scene.add(new T.Points(hg, new T.PointsMaterial({ map: glowTex(), size: 7, color: 0xffc27a, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
      // buildings with lit windows
      const win = (hue) => tex(128, 128, (c, w, h) => {
        c.fillStyle = '#15141b'; c.fillRect(0, 0, w, h);
        for (let y = 4; y < h; y += 16) for (let x = 4; x < w; x += 16) {
          const on = Math.random() < 0.3;
          c.fillStyle = on ? ['#ffd28a', '#ffe7c2', hue][Math.floor(Math.random() * 3)] : '#1f212c';
          c.fillRect(x, y, 9, 10);
        }
      });
      const kinds = [[24, 60, 24, '#9fd0ff'], [34, 30, 30, '#ffb0d0'], [18, 110, 18, '#9fd0ff'], [44, 20, 34, '#c8f0b0']];
      const spots = [];
      const clear = (x, z, r) => { for (let i = 0; i < N; i += 4) { const dx = x - P[i].x, dz = z - P[i].z; if (dx * dx + dz * dz < r * r) return false; } return true; };
      for (let tries = 0; tries < 900 && spots.length < 190; tries++) {
        const i = Math.floor(Math.random() * N), sg = Math.random() < 0.5 ? -1 : 1, canalSide = sg > 0 && i >= c0 - 10 && i <= c1 + 10;
        const off = HW + (canalSide ? 42 : 20) + Math.random() * 70, k = Math.floor(Math.random() * kinds.length);
        const x = P[i].x + SIDE[i][0] * sg * off, z = P[i].z + SIDE[i][1] * sg * off, rad = Math.max(kinds[k][0], kinds[k][2]) * 0.8 + HW + 6;
        if (!clear(x, z, rad)) continue;
        if (spots.some(s => Math.hypot(s[0] - x, s[1] - z) < 26)) continue;
        spots.push([x, z, k, Math.atan2(TAN[i][0], TAN[i][1])]);
      }
      kinds.forEach(([bw, bh, bd, hue], k) => {
        const mine = spots.filter(s => s[2] === k); if (!mine.length) return;
        const t = win(hue); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(bw / 12)), Math.max(1, Math.round(bh / 12)));
        const mat = new T.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 });
        const g = new T.BoxGeometry(bw, bh, bd); g.translate(0, bh / 2, 0);
        const im = new T.InstancedMesh(g, mat, mine.length);
        mine.forEach((s, n) => { const sc = 0.8 + Math.random() * 0.5; m4.compose(new T.Vector3(s[0], 0, s[1]), new T.Quaternion().setFromEuler(new T.Euler(0, s[3], 0)), new T.Vector3(1, sc, 1)); im.setMatrixAt(n, m4); });
        scene.add(im);
      });
      // ground, stars, moon
      const ground = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.MeshLambertMaterial({ color: 0x100e14 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
      const st = []; for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.3, r = 1400; st.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
      const sg2 = new T.BufferGeometry(); sg2.setAttribute('position', new T.Float32BufferAttribute(st, 3));
      scene.add(new T.Points(sg2, new T.PointsMaterial({ color: 0xfff3e0, size: 2.2, sizeAttenuation: false, fog: false })));
      const moon = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: 0xfff0d0, fog: false, depthWrite: false })); moon.scale.set(140, 140, 1); moon.position.set(-700, 520, 900); scene.add(moon);
      // minimap base
      let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9; P.forEach(p => { mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x); mnz = Math.min(mnz, p.z); mxz = Math.max(mxz, p.z); });
      mapBounds = { mnx, mnz, s: 136 / Math.max(mxx - mnx, mxz - mnz), ox: 12, oz: 12 };
    }

    function makeCar(color, glow) {
      const g = new T.Group();
      const body = new T.Shape();
      body.moveTo(-2.25, 0.28); body.lineTo(2.18, 0.28); body.quadraticCurveTo(2.36, 0.32, 2.3, 0.55); body.lineTo(1.25, 0.74); body.lineTo(-1.75, 0.8); body.lineTo(-2.25, 0.78); body.closePath();
      const bg = new T.ExtrudeGeometry(body, { depth: 1.86, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2 });
      bg.translate(0, 0, -0.93); bg.rotateY(-Math.PI / 2);
      const paint = new T.MeshPhongMaterial({ color, shininess: 110, specular: 0x999999, emissive: new T.Color(color).multiplyScalar(0.12) });
      g.add(new T.Mesh(bg, paint));
      const cab = new T.Shape();
      cab.moveTo(1.25, 0.72); cab.lineTo(0.45, 1.13); cab.lineTo(-0.95, 1.13); cab.lineTo(-1.72, 0.79); cab.closePath();
      const cg = new T.ExtrudeGeometry(cab, { depth: 1.56, bevelEnabled: false }); cg.translate(0, 0, -0.78); cg.rotateY(-Math.PI / 2);
      g.add(new T.Mesh(cg, new T.MeshPhongMaterial({ color: 0x0c0f16, shininess: 140, specular: 0xaaaaaa })));
      const roof = new T.Mesh(new T.BoxGeometry(1.46, 0.05, 1.3), paint); roof.position.set(0, 1.15, -0.25); g.add(roof);
      const spoiler = new T.Mesh(new T.BoxGeometry(1.9, 0.06, 0.36), paint); spoiler.position.set(0, 1.02, -2.05); g.add(spoiler);
      [-0.6, 0.6].forEach(x => { const p = new T.Mesh(new T.BoxGeometry(0.06, 0.22, 0.12), paint); p.position.set(x, 0.9, -2.02); g.add(p); });
      const tire = new T.MeshLambertMaterial({ color: 0x111111 }), rim = new T.MeshPhongMaterial({ color: 0x9a9aa2, shininess: 80 });
      const wheels = [];
      [[0.93, 1.45], [-0.93, 1.45], [0.93, -1.42], [-0.93, -1.42]].forEach(([x, z]) => {
        const w = new T.Group();
        const t = new T.Mesh(new T.CylinderGeometry(0.37, 0.37, 0.3, 18), tire); t.rotation.z = Math.PI / 2; w.add(t);
        const r = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.31, 10), rim); r.rotation.z = Math.PI / 2; w.add(r);
        w.position.set(x, 0.37, z); g.add(w); wheels.push(w);
      });
      const hl = new T.MeshBasicMaterial({ color: 0xfff4d6 }), tl = new T.MeshBasicMaterial({ color: 0x8a0f16 });
      [-0.62, 0.62].forEach(x => { const h = new T.Mesh(new T.BoxGeometry(0.42, 0.12, 0.06), hl); h.position.set(x, 0.52, 2.3); g.add(h); const t = new T.Mesh(new T.BoxGeometry(0.5, 0.1, 0.06), tl); t.position.set(x, 0.66, -2.3); g.add(t); });
      const under = new T.Mesh(new T.PlaneGeometry(3.2, 6.2), new T.MeshBasicMaterial({ map: glowTex(), color: glow, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending }));
      under.rotation.x = -Math.PI / 2; under.position.y = 0.04; g.add(under);
      const flames = [];
      [-0.45, 0.45].forEach(x => { const f = new T.Mesh(new T.ConeGeometry(0.13, 0.9, 8), new T.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false })); f.rotation.x = -Math.PI / 2; f.position.set(x, 0.36, -2.75); f.visible = false; g.add(f); flames.push(f); });
      scene.add(g);
      return { g, wheels, tail: tl, flames };
    }

    const place = (c, prog, lane) => { const i = ((Math.round(prog) % N) + N) % N, p = P[i], s = SIDE[i]; c.x = p.x + s[0] * lane; c.z = p.z + s[1] * lane; c.h = Math.atan2(TAN[i][0], TAN[i][1]); c.idx = i; c.prog = prog; };
    function setupRace() {
      const colors = [[0xeaa53e, 0xff9a2a], [0xd23a3a, 0xff3355], [0x2f6fd0, 0x3aa0ff], [0xe8e8ea, 0xb070ff], [0x2c9b62, 0x33ff99], [0x6b3fc4, 0xff4fd8]];
      const names = ['You', 'Rehan', 'Ayesha', 'Bilal', 'Sana', 'Hamza'];
      if (!cars.length) cars = colors.map(([c, gl], i) => Object.assign(makeCar(c, gl), { name: names[i], isPlayer: i === 0 }));
      const grid = [[-6, -4.5], [-6, 4.5], [-14, -4.5], [-14, 4.5], [-22, -4.5], [-22, 4.5]], order = [1, 2, 0, 3, 4, 5];
      cars.forEach((c, i) => {
        const [pr, lane] = grid[order.indexOf(i)];
        place(c, pr, lane); c.vx = 0; c.vz = 0; c.vf = 0; c.v = 0; c.lane = lane; c.laneT = lane; c.steer = 0; c.lap = 0; c.done = false; c.finishT = 0;
        c.maxv = c.isPlayer ? 0 : 63 + i * 1.9 + Math.random() * 2; c.nitro = 1; c.lapStart = 0; c.best = 0; c.wrong = 0;
      });
      player = cars[0]; ais = cars.slice(1);
      raceT = 0; state = 'count'; countT = 3.2; showMsg('');
    }

    function input() {
      const k = keys;
      return { up: k.ArrowUp || k.w || k.W || k.tUp, down: k.ArrowDown || k.s || k.S || k.tDown, left: k.ArrowLeft || k.a || k.A || k.tLeft, right: k.ArrowRight || k.d || k.D || k.tRight, hb: k[' '] || k.tHb, nitro: k.Shift || k.n || k.N || k.tNitro };
    }
    const trackIdx = (c, span) => { let best = c.idx, bd = Infinity; for (let k = -span; k <= span; k++) { const i = (c.idx + k + N) % N, dx = c.x - P[i].x, dz = c.z - P[i].z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; };
    const advance = (c, ni) => { let d = ni - c.idx; if (d > N / 2) d -= N; if (d < -N / 2) d += N; c.prog += d; c.idx = ni; };

    function updatePlayer(dt) {
      const c = player, I = state === 'race' && !c.done ? input() : { };
      const fx = Math.sin(c.h), fz = Math.cos(c.h), sx = Math.cos(c.h), sz = -Math.sin(c.h);
      let vf = c.vx * fx + c.vz * fz, vl = c.vx * sx + c.vz * sz;
      const nit = I.nitro && c.nitro > 0.02 && vf > 5;
      c.nitroOn = nit; c.nitro = clamp(c.nitro + (nit ? -0.28 : 0.045) * dt, 0, 1);
      const maxV = nit ? 94 : 73;
      if (I.up) vf += (vf < 0 ? 34 : (27 * Math.max(0, 1 - vf / maxV) + (nit ? 20 : 0))) * dt;
      if (I.down) vf -= (vf > 1 ? 44 : 14) * dt;
      if (vf < -16) vf = -16;
      if (!I.up && !I.down) vf -= Math.sign(vf) * Math.min(Math.abs(vf), (1.6 + 0.0045 * vf * vf) * dt);
      if (I.hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 7 * dt);
      const st = ((I.left ? 1 : 0) - (I.right ? 1 : 0)) * 0.55 * (1 - 0.62 * Math.min(1, Math.abs(vf) / 70));
      c.steer += (st - c.steer) * Math.min(1, dt * 7);
      c.h += c.steer * clamp(vf, -18, 27) * 0.125 * (I.hb ? 1.7 : 1) * dt;
      vl *= Math.exp(-(I.hb ? 1.6 : nit ? 6.5 : 8.5) * dt);
      c.slip = Math.abs(vl);
      const nfx = Math.sin(c.h), nfz = Math.cos(c.h), nsx = Math.cos(c.h), nsz = -Math.sin(c.h);
      c.vx = nfx * vf + nsx * vl; c.vz = nfz * vf + nsz * vl; c.vf = vf;
      c.x += c.vx * dt; c.z += c.vz * dt;
      constrain(c, true);
      const t = TAN[c.idx]; c.wrong = (nfx * t[0] + nfz * t[1] < -0.35 && Math.abs(vf) > 4) ? c.wrong + dt : 0;
    }
    function constrain(c, isP) {
      advance(c, trackIdx(c, 30));
      const i = c.idx, s = SIDE[i], off = (c.x - P[i].x) * s[0] + (c.z - P[i].z) * s[1], lim = HW - 1.15;
      if (Math.abs(off) > lim) {
        const push = off - Math.sign(off) * lim; c.x -= s[0] * push; c.z -= s[1] * push;
        const vs = c.vx * s[0] + c.vz * s[1];
        if (Math.sign(vs) === Math.sign(off)) { c.vx -= s[0] * vs * 1.45; c.vz -= s[1] * vs * 1.45; c.vx *= 0.985; c.vz *= 0.985; if (isP && Math.abs(vs) > 3) { shake = Math.min(1, Math.abs(vs) / 20); thud(Math.abs(vs)); } }
      }
    }
    function updateAI(c, dt) {
      if (state !== 'race' && state !== 'done') return;
      const ahead = CURV[(c.idx + 28) % N] + CURV[(c.idx + 14) % N];
      let target = c.maxv * (1 - clamp(ahead * 11, 0, 0.5));
      const gap = (c.prog - player.prog) * SEG;
      if (!player.done) { if (gap > 140) target *= 0.9; else if (gap < -160) target *= 1.08; }
      if (c.done) target = Math.min(target, 30);
      const acc = target > c.v ? 13 : 24; c.v += clamp(target - c.v, -acc * dt, acc * dt);
      for (const o of cars) {
        if (o === c) continue; const d = (o.prog - c.prog) * SEG;
        if (d > 0 && d < 16 && Math.abs(o.lane - c.lane) < 3.2) { c.laneT = clamp(c.lane + (c.lane > o.lane ? 4 : -4), -7.5, 7.5); if (Math.abs(c.laneT) >= 7.5) c.v = Math.min(c.v, (o.v || Math.abs(o.vf)) * 0.97); }
      }
      c.lane += clamp(c.laneT - c.lane, -3 * dt, 3 * dt);
      const np = c.prog + c.v * dt / SEG, i0 = Math.floor(np), f = np - i0, a = ((i0 % N) + N) % N, b = (a + 1) % N;
      const px = P[a].x + (P[b].x - P[a].x) * f, pz = P[a].z + (P[b].z - P[a].z) * f, s = SIDE[a];
      c.x = px + s[0] * c.lane; c.z = pz + s[1] * c.lane; c.h = Math.atan2(TAN[a][0], TAN[a][1]) + c.lane * 0.0; c.idx = a; c.prog = np;
      c.vx = Math.sin(c.h) * c.v; c.vz = Math.cos(c.h) * c.v;
    }
    function collide() {
      const c = player;
      for (const o of ais) {
        const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz);
        if (d < 4.3 && d > 0.01) {
          const nx = dx / d, nz = dz / d, push = (4.3 - d) / 2;
          c.x -= nx * push; c.z -= nz * push; o.lane += ((o.x + nx * push - P[o.idx].x) * SIDE[o.idx][0] + (o.z + nz * push - P[o.idx].z) * SIDE[o.idx][1] - o.lane) * 0.5;
          const rel = (c.vx - o.vx) * nx + (c.vz - o.vz) * nz;
          if (rel > 0) { c.vx -= nx * rel * 0.8; c.vz -= nz * rel * 0.8; o.v = Math.min(o.maxv * 1.05, o.v + rel * 0.4); shake = Math.min(1, rel / 15); thud(rel); }
        }
      }
    }
    function lapCheck(c) {
      const lap = Math.floor(c.prog / N);
      if (lap > c.lap && c.prog > 0) {
        const lt = raceT - c.lapStart; c.lapStart = raceT; c.lap = lap;
        if (!c.best || lt < c.best) c.best = lt;
        if (c.isPlayer) {
          if (lap >= LAPS) { c.done = true; c.finishT = raceT; finish(); }
          else { showMsg(lap === LAPS - 1 ? 'FINAL LAP' : `LAP ${lap + 1}`, 1.6); beep(880, 0.18); }
        } else if (lap >= LAPS && !c.done) { c.done = true; c.finishT = raceT; }
      }
    }
    function finish() {
      state = 'done';
      const rows = cars.map(c => ({ c, t: c.done ? c.finishT : raceT + (LAPS * N - c.prog) * SEG / Math.max(40, c.v || 50) })).sort((a, b) => a.t - b.t);
      const pos = rows.findIndex(r => r.c === player) + 1;
      if (pos === 1) Snd.play('win');
      setTimeout(() => {
        if (!alive) return;
        ov.hidden = false; ov.innerHTML = '';
        ov.append(el('div.rc-card', {},
          el('small', { text: 'RACE COMPLETE' }), el('b.rc-big', { text: ['', '1st', '2nd', '3rd', '4th', '5th', '6th'][pos] + ' place' }),
          el('table.rc-res', {}, rows.map((r, i) => el('tr' + (r.c === player ? '.me' : ''), {}, el('td', { text: i + 1 }), el('td', { text: r.c.name }), el('td', { text: fmtRace(r.t) }), el('td', { text: r.c.best ? 'best ' + fmtRace(r.c.best) : '' })))),
          el('div.rc-btns', {}, el('button.btn.pri', { text: 'Race again', onclick: () => { ov.hidden = true; setupRace(); } }))));
      }, 900);
    }
    const fmtRace = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
    let msgT = 0;
    const showMsg = (t, dur) => { hud.msg.textContent = t; hud.msg.classList.toggle('on', !!t); msgT = dur || 0; };

    /* ---------- audio: synthesized engine, tyres, nitro ---------- */
    function startAudio() {
      if (audio || !Prefs.sounds || Prefs.volume <= 0) return;
      const ac = Snd.ensure(); if (!ac) return;
      const out = ac.createGain(); out.gain.value = 0.9; out.connect(Snd.master);
      const eng = ac.createGain(); eng.gain.value = 0.0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 4;
      const o1 = ac.createOscillator(); o1.type = 'sawtooth'; const o2 = ac.createOscillator(); o2.type = 'square'; const o2g = ac.createGain(); o2g.gain.value = 0.35;
      o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(eng); eng.connect(out); o1.start(); o2.start();
      const len = ac.sampleRate, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const nz = ac.createBufferSource(); nz.buffer = buf; nz.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3; const sq = ac.createGain(); sq.gain.value = 0;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const ng = ac.createGain(); ng.gain.value = 0;
      nz.connect(bp); bp.connect(sq); sq.connect(out); nz.connect(hp); hp.connect(ng); ng.connect(out); nz.start();
      audio = { ac, out, eng, lp, o1, o2, sq, ng, nz };
    }
    function stopAudio() { if (!audio) return; try { audio.o1.stop(); audio.o2.stop(); audio.nz.stop(); audio.out.disconnect(); } catch (e) { /* already stopped */ } audio = null; }
    const beep = (f, d) => sfx(f, d, 'square', 0.06);
    let lastThud = 0;
    const thud = v => { const n = performance.now(); if (n - lastThud < 180) return; lastThud = n; if (Prefs.sounds) { Snd.noise(0.18, Math.min(0.35, v / 40)); Snd.tone(70, 0, 0.2, 'sine', Math.min(0.3, v / 30)); } };
    function updateAudio(rpm, gearChanged) {
      if (!audio) return;
      const t = audio.ac.currentTime, sp = Math.abs(player.vf);
      const f = 42 + rpm * 150;
      audio.o1.frequency.setTargetAtTime(f, t, 0.04); audio.o2.frequency.setTargetAtTime(f / 2, t, 0.04);
      audio.lp.frequency.setTargetAtTime(500 + rpm * 1800, t, 0.05);
      audio.eng.gain.setTargetAtTime(paused ? 0 : (0.05 + (input().up ? 0.07 : 0.03)) * (gearChanged ? 0.4 : 1), t, 0.05);
      audio.sq.gain.setTargetAtTime(paused ? 0 : clamp((player.slip - 4) / 14, 0, 1) * Math.min(1, sp / 15) * 0.16, t, 0.05);
      audio.ng.gain.setTargetAtTime(paused || !player.nitroOn ? 0 : 0.07, t, 0.05);
    }

    /* ---------- HUD ---------- */
    let lastGear = 1, gearDip = 0;
    function drawHUD(dt) {
      const sp = Math.abs(player.vf), kmh = Math.round(sp * 3.6);
      const G = [0, 14, 25, 36, 48, 61, 999];
      let gear = 1; while (gear < 6 && sp > G[gear]) gear++;
      const lo = G[gear - 1], hi = Math.min(G[gear], 80), rpm = player.vf < -0.5 ? 0.45 : clamp(0.2 + 0.8 * (sp - lo) / (hi - lo), 0.18, 1);
      if (gear !== lastGear) { gearDip = 0.12; lastGear = gear; }
      gearDip = Math.max(0, gearDip - dt);
      hud.spd.textContent = kmh; hud.gear.textContent = player.vf < -0.5 ? 'R' : gear;
      hud.arc.style.strokeDashoffset = String(283 * (1 - rpm * 0.75));
      hud.arc.classList.toggle('red', rpm > 0.9);
      hud.nitro.style.width = Math.round(player.nitro * 100) + '%';
      hud.nitro.parentNode.classList.toggle('on', !!player.nitroOn);
      const order = cars.slice().sort((a, b) => (b.done && a.done ? a.finishT - b.finishT : 0) || b.prog - a.prog);
      hud.pos.textContent = order.indexOf(player) + 1;
      hud.lap.textContent = Math.min(LAPS, Math.max(1, player.lap + 1));
      hud.time.textContent = fmtRace(state === 'count' ? 0 : player.done ? player.finishT : raceT);
      hud.best.textContent = player.best ? fmtRace(player.best) : '–';
      if (player.wrong > 1) showMsg('WRONG WAY'); else if (hud.msg.textContent === 'WRONG WAY') showMsg('');
      const m = hud.map.getContext('2d'), b = mapBounds, X = x => b.ox + (x - b.mnx) * b.s, Z = z => b.oz + (z - b.mnz) * b.s;
      if (!mapBase) { mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = 160; const mc = mapBase.getContext('2d'); mc.strokeStyle = 'rgba(255,255,255,.75)'; mc.lineWidth = 4; mc.lineJoin = 'round'; mc.beginPath(); P.forEach((p, i) => i ? mc.lineTo(X(p.x), Z(p.z)) : mc.moveTo(X(p.x), Z(p.z))); mc.closePath(); mc.stroke(); mc.fillStyle = '#fff'; mc.fillRect(X(P[0].x) - 3, Z(P[0].z) - 3, 6, 6); }
      m.clearRect(0, 0, 160, 160); m.drawImage(mapBase, 0, 0);
      cars.forEach(c => { m.fillStyle = c.isPlayer ? '#eaa53e' : '#' + c.g.children[0].material.color.getHexString(); m.beginPath(); m.arc(X(c.x), Z(c.z), c.isPlayer ? 4.5 : 3.2, 0, 7); m.fill(); if (c.isPlayer) { m.strokeStyle = '#000'; m.lineWidth = 1.5; m.stroke(); } });
      speedLines.style.opacity = String(clamp((sp - 45) / 40, 0, 0.6) + (player.nitroOn ? 0.3 : 0));
      speedLines.style.transform = `scale(${1 + Math.random() * 0.04}) rotate(${Math.random() * 4 - 2}deg)`;
      return { rpm, gearChanged: gearDip > 0 };
    }

    /* ---------- frame ---------- */
    const camPos = { x: 0, y: 5, z: 0 };
    function frame(t) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (paused) return;
      const dt = Math.min(0.05, (t - (lastT || t)) / 1000); lastT = t;
      if (state === 'count') {
        const before = Math.ceil(countT); countT -= dt; const now = Math.ceil(countT);
        if (now !== before && now > 0) { showMsg(String(now)); beep(520, 0.15); }
        if (countT <= 0) { state = 'race'; showMsg('GO!', 0.9); beep(1040, 0.3); }
      } else if (state === 'race' || state === 'done') raceT += dt;
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) showMsg(''); }
      updatePlayer(dt);
      ais.forEach(c => updateAI(c, dt));
      if (state === 'race' || state === 'done') { collide(); cars.forEach(lapCheck); }
      cars.forEach(c => {
        c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.h;
        const sp = c.isPlayer ? c.vf : c.v; c.wheels.forEach((w, i) => { w.children.forEach(m => { m.rotation.x += sp * dt / 0.37; }); if (i < 2) w.rotation.y = c.isPlayer ? c.steer * 0.9 : 0; });
        c.flames.forEach(f => { f.visible = !!c.nitroOn; f.scale.set(1, 0.8 + Math.random() * 0.5, 1); });
      });
      const braking = input().down && player.vf > 1; player.tail.color.setHex(braking ? 0xff2436 : 0x8a0f16);
      // camera
      const c = player, fx = Math.sin(c.h), fz = Math.cos(c.h), sp = Math.abs(c.vf);
      const back = [9.5, 16, -0.2][camMode], up = [3.3, 6.2, 1.25][camMode];
      const tx = c.x - fx * back, tz = c.z - fz * back, k = camMode === 2 ? 1 : 1 - Math.exp(-dt * 7);
      camPos.x += (tx - camPos.x) * k; camPos.z += (tz - camPos.z) * k; camPos.y += (up - camPos.y) * k;
      shake = Math.max(0, shake - dt * 2.5);
      camera.position.set(camPos.x + (Math.random() - 0.5) * shake * 0.6, camPos.y + (Math.random() - 0.5) * shake * 0.4, camPos.z);
      camera.lookAt(c.x + fx * 8, camMode === 2 ? 1.1 : 1.3, c.z + fz * 8);
      const fov = 60 + Math.min(1, sp / 90) * 14 + (c.nitroOn ? 7 : 0);
      if (Math.abs(camera.fov - fov) > 0.2) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
      player.g.visible = camMode !== 2;
      const h = drawHUD(dt); updateAudio(h.rpm, h.gearChanged);
      renderer.render(scene, camera);
    }

    function init() {
      T = window.THREE;
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      stage.prepend(renderer.domElement); renderer.domElement.className = 'rc-gl';
      scene = new T.Scene(); scene.background = new T.Color(0x0d0a18); scene.fog = new T.Fog(0x160f22, 40, 560);
      camera = new T.PerspectiveCamera(60, 1, 0.1, 3000);
      scene.add(new T.HemisphereLight(0x5f6aa8, 0x20160f, 0.62));
      const moonL = new T.DirectionalLight(0xa9b8ff, 0.4); moonL.position.set(-300, 400, 200); scene.add(moonL);
      buildTrack(); setupRace(); state = 'intro';
      const head = new T.SpotLight(0xfff0d8, 2.4, 110, 0.55, 0.6, 1.4); head.position.set(0, 1, 2); player.g.add(head); const fill = new T.PointLight(0xffe2b8, 1.3, 16, 1.6); fill.position.set(0, 4.5, -4.5); player.g.add(fill); const tgt = new T.Object3D(); tgt.position.set(0, 0, 30); player.g.add(tgt); head.target = tgt;
      const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
      ro = new ResizeObserver(resize); ro.observe(stage); resize();
      camPos.x = player.x - Math.sin(player.h) * 9.5; camPos.z = player.z - Math.cos(player.h) * 9.5;
      intro();
      raf = requestAnimationFrame(frame);
    }
    function intro() {
      ov.hidden = false; ov.innerHTML = '';
      ov.append(el('div.rc-card', {}, el('small', { text: 'NIGHT CIRCUIT · 3 LAPS · 6 CARS' }), el('b.rc-big', { text: 'Canal Run' }),
        el('p', { text: 'Street race along the canal. Beat five rivals over three laps. Drift the corners, save nitro for the straights.' }),
        el('div.rc-keys', { html: '<span><b>W ↑</b> gas</span><span><b>S ↓</b> brake · reverse</span><span><b>A D ← →</b> steer</span><span><b>Space</b> handbrake drift</span><span><b>Shift</b> nitro</span><span><b>C</b> camera</span><span><b>R</b> reset car</span><span><b>Esc</b> pause</span>' }),
        el('div.rc-btns', {}, el('button.btn.pri', { text: 'Start race', onclick: go }))));
    }
    function go() { ov.hidden = true; startAudio(); setupRace(); stage.focus({ preventScroll: true }); }
    function setPaused(p) {
      if (state === 'intro' || state === 'loading') return;
      paused = p; lastT = 0;
      if (audio) updateAudio(0.2, false);
      if (p && state !== 'done') { ov.hidden = false; ov.innerHTML = ''; ov.append(el('div.rc-card', {}, el('b.rc-big', { text: 'Paused' }), el('div.rc-btns', {}, el('button.btn.pri', { text: 'Resume', onclick: () => setPaused(false) }), el('button.btn', { text: 'Restart', onclick: () => { paused = false; ov.hidden = true; setupRace(); } })))); }
      else if (!p && state !== 'done') { ov.hidden = true; stage.focus({ preventScroll: true }); }
    }
    function resetCar() { const i = player.idx; place(player, player.prog, 0); player.prog = Math.round(player.prog); player.idx = i; player.x = P[i].x; player.z = P[i].z; player.h = Math.atan2(TAN[i][0], TAN[i][1]); player.vx = player.vz = player.vf = 0; }

    return WM.open({
      app: 'racer', title: 'Canal Run', icon: 'racer', w: 1020, h: 640, minW: 360, minH: 300,
      render(body, w) {
        ov = el('div.rc-ov', {}, el('div.rc-card', {}, el('b', { text: 'Loading the 3D engine…' })));
        hud.msg = el('div.rc-msg');
        hud.pos = el('b', { text: '1' }); hud.lap = el('b', { text: '1' }); hud.time = el('span', { text: '0:00.00' }); hud.best = el('span', { text: '–' });
        hud.spd = el('b.rc-spd', { text: '0' }); hud.gear = el('b', { text: '1' }); hud.map = el('canvas.rc-map', { width: '160', height: '160' });
        hud.nitro = el('i');
        const svgNS = 'http://www.w3.org/2000/svg';
        const tach = document.createElementNS(svgNS, 'svg'); tach.setAttribute('viewBox', '0 0 120 120'); tach.classList.add('rc-tach');
        tach.innerHTML = '<circle cx="60" cy="60" r="45" class="bg" stroke-dasharray="212 283" transform="rotate(135 60 60)"/><circle cx="60" cy="60" r="45" class="fg" stroke-dasharray="283" transform="rotate(135 60 60)"/>';
        hud.arc = tach.querySelector('.fg');
        speedLines = el('div.rc-lines');
        const touch = el('div.rc-touch');
        if (matchMedia('(pointer: coarse)').matches || isPhone()) {
          [['◀', 'tLeft', 'l'], ['▶', 'tRight', 'r'], ['BRAKE', 'tDown', 'b'], ['GAS', 'tUp', 'g'], ['N₂O', 'tNitro', 'n'], ['DRIFT', 'tHb', 'h']].forEach(([t, k, c]) => {
            const b = el('button.rc-tb.rc-tb-' + c, { text: t, tabindex: '-1' });
            b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, () => { keys[k] = false; }));
            touch.append(b);
          });
        }
        stage = el('div.rc', { tabindex: '0' }, speedLines,
          el('div.rc-tl', {}, el('div.rc-pos', {}, hud.pos, el('small', { text: '/6' })), el('div.rc-row', {}, 'LAP ', hud.lap, `/${LAPS}`), el('div.rc-row', {}, 'TIME ', hud.time), el('div.rc-row.dim', {}, 'BEST ', hud.best)),
          hud.map,
          el('div.rc-gauge', {}, tach, el('div.rc-read', {}, hud.spd, el('small', { text: 'km/h' }), el('div.rc-gear', {}, 'GEAR ', hud.gear)), el('div.rc-nitro', {}, el('small', { text: 'NITRO' }), el('div.bar', {}, hud.nitro))),
          hud.msg, touch, ov);
        body.append(stage);
        stage.addEventListener('keydown', e => {
          keys[e.key] = true;
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
          if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.stopPropagation(); setPaused(!paused); }
          if ((e.key === 'c' || e.key === 'C') && !e.repeat) camMode = (camMode + 1) % 3;
          if ((e.key === 'r' || e.key === 'R') && state === 'race') resetCar();
          if (e.key === 'Enter' && state === 'intro') go();
          e.stopPropagation();
        });
        stage.addEventListener('keyup', e => { keys[e.key] = false; if (e.key === 'Shift') keys.Shift = false; });
        stage.addEventListener('focusout', e => { if (e.relatedTarget && stage.contains(e.relatedTarget)) return; keys = {}; if (state === 'race') setPaused(true); });
        w.onFocus = () => stage.focus({ preventScroll: true });
        w.onVis = v => { if (!v && state === 'race') setPaused(true); };
        w.cleanups = [() => { alive = false; cancelAnimationFrame(raf); stopAudio(); if (ro) ro.disconnect(); if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } }];
        const boot = () => { if (!alive) return; try { init(); } catch (e) { console.error(e); fail('Your browser couldn’t start WebGL for the 3D view.'); } };
        if (window.THREE) boot();
        else loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js').then(boot).catch(() => fail('The 3D engine didn’t download. Check your connection and reopen the game.'));
      }
    });
  }
});
