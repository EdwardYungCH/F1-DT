/* =====================================================================
   F1 DT 麥昆小車模擬器 — 物理引擎及程式執行器
   （不依賴網頁，可在瀏覽器及測試環境運行）
   單位：厘米 (cm)、秒 (s)；世界座標 y 軸向上；角度用弧度。
   ===================================================================== */
(function (root) {
  'use strict';

  /* ---------- 隨機數（可重複） ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  /* ---------- 小車尺寸（俯視） ---------- */
  var CAR = {
    track: 9.2,          // 左右輪中心距離
    wheelR: 2.2,
    sensorAhead: 5.2,    // 巡線感應器在車軸前方的距離
    // 5 路感應器的橫向位置（正數 = 車的左邊）：L2 L1 M R1 R2
    sensorLat: [4.4, 1.7, 0, -1.7, -4.4],   // L2、R2 在車身左右兩側
    names: ['L2', 'L1', 'M', 'R1', 'R2'],
    bodyFront: 7.6, bodyBack: -5.6, bodyHalfW: 4.2
  };

  /* ---------- 巡線圖 ---------- */
  function stadium(L, R, n) {             // 直立的「0」字：兩條直路 + 兩個半圓
    var pts = [], i, a;
    var seg = Math.max(8, Math.round(n * L / (2 * L + 2 * Math.PI * R)));
    var arc = Math.max(16, Math.round(n * Math.PI * R / (2 * L + 2 * Math.PI * R)));
    for (i = 0; i < seg; i++) pts.push([R, -L / 2 + L * i / seg]);                         // 右邊直路，向上
    for (i = 0; i < arc; i++) { a = Math.PI * i / arc; pts.push([R * Math.cos(a), L / 2 + R * Math.sin(a)]); }   // 頂部半圓（向左轉）
    for (i = 0; i < seg; i++) pts.push([-R, L / 2 - L * i / seg]);                         // 左邊直路，向下
    for (i = 0; i < arc; i++) { a = Math.PI + Math.PI * i / arc; pts.push([R * Math.cos(a), -L / 2 + R * Math.sin(a)]); }
    return pts;
  }
  function catmull(ctrl, per) {            // 閉合 Catmull-Rom 曲線
    var out = [], n = ctrl.length;
    for (var i = 0; i < n; i++) {
      var p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (var k = 0; k < per; k++) {
        var t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    return out;
  }
  function turtle(x, y, hDeg, cmds) {      // ['S', 長度] 直路；['L'|'R', 角度, 半徑] 彎位
    var pts = [[x, y]], h = hDeg * Math.PI / 180;
    cmds.forEach(function (c) {
      var i, n;
      if (c[0] === 'S') {
        n = Math.max(1, Math.round(c[1] / 0.5));
        for (i = 1; i <= n; i++) pts.push([x + Math.cos(h) * c[1] * i / n, y + Math.sin(h) * c[1] * i / n]);
        x += Math.cos(h) * c[1]; y += Math.sin(h) * c[1];
      } else {
        var dir = c[0] === 'L' ? 1 : -1, r = c[2], ang = c[1] * Math.PI / 180;
        var cx = x - dir * Math.sin(h) * r, cy = y + dir * Math.cos(h) * r;
        var a0 = Math.atan2(y - cy, x - cx);
        n = Math.max(4, Math.round(ang * r / 0.4));
        for (i = 1; i <= n; i++) { var a = a0 + dir * ang * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
        x = cx + r * Math.cos(a0 + dir * ang); y = cy + r * Math.sin(a0 + dir * ang); h += dir * ang;
      }
    });
    pts.pop();                               // 最後一點與起點重疊
    return pts;
  }
  function resample(pts, step) {           // 每隔 step 厘米取一點，方便計算進度
    var out = [], n = pts.length, acc = 0, i;
    out.push(pts[0].slice());
    for (i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), pos = 0;
      while (acc + (d - pos) >= step) {
        pos += step - acc; acc = 0;
        out.push([a[0] + dx * pos / d, a[1] + dy * pos / d]);
      }
      acc += d - pos;
    }
    if (Math.hypot(out[out.length - 1][0] - out[0][0], out[out.length - 1][1] - out[0][1]) < step * 0.5) out.pop();
    return out;
  }

  var SCENES = {
    tiles: {
      name: '地磚地面', kind: 'tiles', tile: 30,
      view: { x0: -25, y0: -25, x1: 55, y1: 55 },
      start: { x: 0, y: 0, h: Math.PI / 2 }          // 車頭向上，放在地磚一角
    },
    oval: {
      name: '0 字巡線圖', kind: 'track', width: 2.0,
      paper: { x0: -24, y0: -44, x1: 24, y1: 44 },
      build: function () { return turtle(6.5, -28, 90, [['S', 56], ['L', 180, 6.5], ['S', 56], ['L', 180, 6.5]]); },
      startIndex: 0.12                               // 右邊直路，向上行（逆時針）
    },
    sharp: {
      name: '急彎挑戰圖', kind: 'track', width: 2.0,
      paper: { x0: -40, y0: -42, x1: 14, y1: 38 },
      build: function () {
        return turtle(0, -24, 90, [['S', 44], ['L', 180, 7], ['S', 10], ['R', 90, 6], ['L', 90, 6], ['S', 20], ['L', 90, 10], ['S', 8], ['L', 90, 8]]);
      },
      startIndex: 0.06
    }
  };

  function buildScene(id) {
    var sc = SCENES[id] || SCENES.tiles;
    var S = { id: id, name: sc.name, kind: sc.kind };
    if (sc.kind === 'tiles') {
      S.tile = sc.tile; S.view = sc.view; S.start = sc.start; return S;
    }
    S.width = sc.width; S.paper = sc.paper;
    S.raw = sc.build();
    S.pts = resample(S.raw, 0.5);
    var N = S.pts.length, i0 = Math.floor(N * sc.startIndex) % N;
    var a = S.pts[i0], b = S.pts[(i0 + 4) % N];
    var h = Math.atan2(b[1] - a[1], b[0] - a[0]);
    // 把小車放好：M 感應器對正黑線
    S.start = { x: a[0] - CAR.sensorAhead * Math.cos(h), y: a[1] - CAR.sensorAhead * Math.sin(h), h: h };
    S.startIndex = i0;
    S.length = N * 0.5;
    var p = sc.paper; S.view = { x0: p.x0 - 6, y0: p.y0 - 6, x1: p.x1 + 6, y1: p.y1 + 6 };
    // 空間格子，加快「離黑線多遠」的計算
    S.grid = {}; S.cell = 4;
    for (var i = 0; i < N; i++) {
      var q = S.pts[i], q2 = S.pts[(i + 1) % N];
      var cx0 = Math.floor(Math.min(q[0], q2[0]) / S.cell) - 1, cx1 = Math.floor(Math.max(q[0], q2[0]) / S.cell) + 1;
      var cy0 = Math.floor(Math.min(q[1], q2[1]) / S.cell) - 1, cy1 = Math.floor(Math.max(q[1], q2[1]) / S.cell) + 1;
      for (var cx = cx0; cx <= cx1; cx++) for (var cy = cy0; cy <= cy1; cy++) {
        var k = cx + ',' + cy; (S.grid[k] || (S.grid[k] = [])).push(i);
      }
    }
    return S;
  }

  function segDist(px, py, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var x = a[0] + t * dx - px, y = a[1] + t * dy - py;
    return Math.sqrt(x * x + y * y);
  }
  function nearest(S, x, y) {               // 回傳 {d: 距離, i: 最近的點}
    var k = Math.floor(x / S.cell) + ',' + Math.floor(y / S.cell);
    var list = S.grid[k], best = { d: 1e9, i: -1 }, N = S.pts.length;
    if (!list) return best;
    for (var j = 0; j < list.length; j++) {
      var i = list[j], d = segDist(x, y, S.pts[i], S.pts[(i + 1) % N]);
      if (d < best.d) { best.d = d; best.i = i; }
    }
    return best;
  }

  /* ---------- 物理引擎 ---------- */
  var PHYS = { pivotStart: 10, pivotFull: 40, pivotMin: 0.2, tauAcc: 0.25, tauStop: 0.25, tauRev: 0.12, vSlip: 12 };
  function pivotLoad(s) {
    var f = (s - PHYS.pivotStart) / (PHYS.pivotFull - PHYS.pivotStart);
    return f < PHYS.pivotMin ? PHYS.pivotMin : f > 1 ? 1 : f;
  }
  function motorTau(v, target) {
    if (Math.abs(v) > 0.05 && target * v < 0) return PHYS.tauRev;
    if (target === 0) return PHYS.tauStop;
    return PHYS.tauAcc;
  }
  function Engine(opts) {
    opts = opts || {};
    this.sceneId = opts.scene || 'tiles';
    this.scene = buildScene(this.sceneId);
    this.realism = opts.realism !== false;
    this.setSeed(opts.seed || 'demo');
    this.reset();
  }
  Engine.prototype.setSeed = function (seed) {
    this.seedStr = String(seed);
    var r = mulberry32(hashStr(seed));
    // 每位學生的小車都有少少不同（電量、左右馬達、地面摩擦）
    this.profile = this.realism ? {
      battery: 0.88 + r() * 0.15,              // 0.88 – 1.03
      bias: (r() - 0.5) * 0.07,                // 左右馬達力度差 ±3.5%
      scrub: 0.60 + r() * 0.08,                // 轉彎時車輪打滑
      dead: 4 + Math.round(r() * 2)            // 速度低於此值馬達推不動
    } : { battery: 1, bias: 0, scrub: 0.64, dead: 4 };
    this.rand = mulberry32(hashStr(seed + '#run'));
  };
  Engine.prototype.setRealism = function (on) { this.realism = !!on; this.setSeed(this.seedStr); this.reset(); };
  Engine.prototype.reset = function () {
    var s = this.scene.start;
    this.t = 0;
    this.car = { x: s.x, y: s.y, h: s.h, vL: 0, vR: 0 };
    this.cmd = { L: 0, R: 0 };                 // 有正負號的速度指令 (-255..255)
    this.inited = false;
    this.leds = { L: false, R: false };
    this.display = null;
    this.trail = [[s.x, s.y]];
    this.trailT = 0;
    this.distance = 0;
    this.turned = 0;
    this.prog = { idx: this.scene.startIndex || 0, laps: 0, acc: 0, best: null, lapStart: 0 };
    this.lapTimes = [];
    this.sharpTurns = 0;
    this.offLineTime = 0;
    this.maxOff = 0;
    this.warnings = {};
    this.events = [];
    this.lastRead = [0, 0, 0, 0, 0];
    this.runJitter = this.realism ? 1 + (this.rand() - 0.5) * 0.02 : 1;
  };
  Engine.prototype.warn = function (code, msg) {
    if (this.warnings[code]) return; this.warnings[code] = msg; this.events.push({ t: this.t, type: 'warn', code: code, msg: msg });
  };
  Engine.prototype.wheelSpeed = function (cmd, side) {   // 指令 → 目標輪速 (cm/s)
    var p = this.profile, s = Math.abs(cmd);
    if (s <= p.dead) return 0;
    var v = (s - p.dead) * 0.24 * p.battery * this.runJitter;
    v *= side === 'L' ? (1 + p.bias) : (1 - p.bias);
    return cmd < 0 ? -v : v;
  };
  Engine.prototype.setMotor = function (which, dir, speed) {
    if (!this.inited) { this.warn('noinit', '小車未初始化：程式開頭要先加「初始化麥昆Plus」，否則馬達不會轉。'); return; }
    speed = Math.max(0, Math.min(255, Math.round(+speed || 0)));
    var v = dir < 0 ? -speed : speed;
    var before = this.cmd.L < 0 || this.cmd.R < 0;
    if (which === 'L' || which === 'A') this.cmd.L = v;
    if (which === 'R' || which === 'A') this.cmd.R = v;
    if (!before && (this.cmd.L < 0 || this.cmd.R < 0) && (this.cmd.L > 0 || this.cmd.R > 0)) this.sharpTurns++;   // 一輪前進、一輪後退 = 急轉
  };
  Engine.prototype.stopMotor = function (which) {
    if (!this.inited) { this.warn('noinit', '小車未初始化：程式開頭要先加「初始化麥昆Plus」，否則馬達不會轉。'); return; }
    if (which === 'L' || which === 'A') this.cmd.L = 0;
    if (which === 'R' || which === 'A') this.cmd.R = 0;
  };
  Engine.prototype.sensorPos = function (i) {
    var c = this.car, ch = Math.cos(c.h), sh = Math.sin(c.h), lat = CAR.sensorLat[i];
    return [c.x + CAR.sensorAhead * ch - lat * sh, c.y + CAR.sensorAhead * sh + lat * ch];
  };
  Engine.prototype.readLine = function (i) {
    if (this.scene.kind !== 'track') { this.lastRead[i] = 0; return 0; }
    var p = this.sensorPos(i), sc = this.scene, pp = sc.paper;
    if (p[0] < pp.x0 || p[0] > pp.x1 || p[1] < pp.y0 || p[1] > pp.y1) {
      // 感應器伸出巡線圖外面：地面顏色較深，偶然會讀到 1
      var v0 = this.realism && this.rand() < 0.15 ? 1 : 0; this.lastRead[i] = v0; return v0;
    }
    var n = nearest(sc, p[0], p[1]);
    var edge = sc.width / 2 + (this.realism ? (this.rand() - 0.5) * 0.25 : 0);
    var v = n.d <= edge ? 1 : 0;
    this.lastRead[i] = v;
    return v;
  };
  Engine.prototype.readAll = function () { for (var i = 0; i < 5; i++) this.readLine(i); return this.lastRead.slice(); };
  Engine.prototype.step = function (dt) {
    var c = this.car, p = this.profile;
    var tL = this.wheelSpeed(this.cmd.L, 'L'), tR = this.wheelSpeed(this.cmd.R, 'R');
    // 一邊車輪停止（剎住）時，另一邊要拖着它轉：低速時扭力不夠，轉得很慢
    if (this.cmd.L === 0 && this.cmd.R !== 0) tR *= pivotLoad(Math.abs(this.cmd.R));
    if (this.cmd.R === 0 && this.cmd.L !== 0) tL *= pivotLoad(Math.abs(this.cmd.L));
    // 慣性：加速及「停止」都要時間；反方向轉動則會主動剎車，所以快得多
    c.vL += (tL - c.vL) * Math.min(1, dt / motorTau(c.vL, tL));
    c.vR += (tR - c.vR) * Math.min(1, dt / motorTau(c.vR, tR));
    if (Math.abs(c.vL) < 1e-4) c.vL = 0; if (Math.abs(c.vR) < 1e-4) c.vR = 0;
    var v = (c.vL + c.vR) / 2;
    // 高速時輪胎打滑，轉向效果變差（轉向不足）
    var w = (c.vR - c.vL) / CAR.track * p.scrub / (1 + (v / PHYS.vSlip) * (v / PHYS.vSlip));
    c.x += v * Math.cos(c.h) * dt; c.y += v * Math.sin(c.h) * dt; c.h += w * dt;
    this.distance += Math.abs(v) * dt; this.turned += w * dt;
    this.t += dt;
    this.trailT += dt;
    if (this.trailT >= 0.05) {
      this.trailT = 0;
      var last = this.trail[this.trail.length - 1];
      if (Math.hypot(last[0] - c.x, last[1] - c.y) > 0.3) { this.trail.push([c.x, c.y]); if (this.trail.length > 6000) this.trail.shift(); }
    }
    if (this.scene.kind === 'track') this.trackProgress(dt);
  };
  Engine.prototype.trackProgress = function (dt) {
    var sc = this.scene, N = sc.pts.length, m = this.sensorPos(2);
    // 在上一個位置附近找最近的點
    var pr = this.prog, best = 1e9, bi = pr.idx;
    for (var o = -40; o <= 40; o++) {
      var i = (pr.idx + o + N) % N, q = sc.pts[i];
      var d = (q[0] - m[0]) * (q[0] - m[0]) + (q[1] - m[1]) * (q[1] - m[1]);
      if (d < best) { best = d; bi = i; }
    }
    best = Math.sqrt(best);
    this.maxOff = Math.max(this.maxOff, best);
    var delta = bi - pr.idx; if (delta > N / 2) delta -= N; if (delta < -N / 2) delta += N;
    if (best < 6) { pr.acc += delta; pr.idx = bi; }
    if (pr.acc >= N) {
      pr.acc -= N; pr.laps++;
      var lt = this.t - pr.lapStart; pr.lapStart = this.t;
      this.lapTimes.push(lt);
      this.events.push({ t: this.t, type: 'lap', lap: pr.laps, time: lt });
    }
    var anyOn = this.lastRead[0] || this.lastRead[1] || this.lastRead[2] || this.lastRead[3] || this.lastRead[4];
    this.offLineTime = best > sc.width / 2 + 3.6 && !anyOn ? this.offLineTime + dt : 0;
    var c = this.car, pp = sc.paper;
    if (c.x < pp.x0 - 8 || c.x > pp.x1 + 8 || c.y < pp.y0 - 8 || c.y > pp.y1 + 8) {
      if (!this.warnings.offpaper) this.events.push({ t: this.t, type: 'offpaper' });
      this.warnings.offpaper = '小車衝出了巡線圖！';
    }
  };
  Engine.prototype.moving = function () { return Math.abs(this.car.vL) + Math.abs(this.car.vR) > 0.05; };
  Engine.prototype.progressFraction = function () {
    if (this.scene.kind !== 'track') return 0;
    return (this.prog.laps * this.scene.pts.length + Math.max(0, this.prog.acc)) / this.scene.pts.length;
  };

  /* ---------- 程式執行器 ----------
     學生程式會轉成 async 函數 prog(api)。每個積木都要花少少時間（例如讀感應器 0.6 ms），
     「暫停」及「重複無限次」之間的 20 ms 都會令模擬時間前進。 */
  var COST = { stmt: 0.0002, read: 0.0006, motor: 0.0004, forever: 0.020 };

  function Runner(engine, hooks) {
    this.E = engine;
    this.hooks = hooks || {};
    this.stopped = false;
    this.done = false;
    this.error = null;
    this.dt = 0.001;
  }
  Runner.prototype.api = function () {
    var R = this, E = this.E;
    function hl(id) { if (R.hooks.highlight) R.hooks.highlight(id); }
    return {
      op: function (id, cost) { hl(id); return R.wait(cost == null ? COST.stmt : cost); },
      pause: function (id, ms) { hl(id); ms = Math.max(0, +ms || 0); return R.wait(ms / 1000 + COST.stmt); },
      init: function (id) {
        hl(id);
        return R.wait(0.6).then(function () { E.inited = true; E.display = 'ok'; if (R.hooks.display) R.hooks.display('ok'); return R.wait(0.5); })
          .then(function () { E.display = null; if (R.hooks.display) R.hooks.display(null); });
      },
      motor: function (id, which, dir, speed) { hl(id); E.setMotor(which, dir, speed); return R.wait(COST.motor); },
      stop: function (id, which) { hl(id); E.stopMotor(which); return R.wait(COST.motor); },
      line: function (id, i) { return R.wait(COST.read).then(function () { return E.readLine(i); }); },
      led: function (id, which, on) {
        hl(id);
        if (which === 'L' || which === 'A') E.leds.L = !!on;
        if (which === 'R' || which === 'A') E.leds.R = !!on;
        return R.wait(COST.motor);
      },
      show: function (id, n) { hl(id); E.display = String(n); if (R.hooks.display) R.hooks.display(String(n)); return R.wait(0.4); },
      foreverGap: function () { return R.wait(COST.forever); },
      check: function () { if (R.stopped) throw new Error('__stopped__'); }
    };
  };
  // 令模擬時間前進 sec 秒；pace() 可以用來配合真實時間（網頁）或者全速（測試）
  Runner.prototype.wait = function (sec) {
    var R = this, E = this.E, target = E.t + sec;
    if (R.stopped) return Promise.reject(new Error('__stopped__'));
    function loop() {
      if (R.stopped) return Promise.reject(new Error('__stopped__'));
      var n = 0;
      while (E.t < target - 1e-9) {
        var dt = Math.min(R.dt, target - E.t);
        E.step(dt);
        if (R.limit && E.t >= R.limit) { R.stopped = true; R.timeout = true; return Promise.reject(new Error('__stopped__')); }
        if (R.hooks.pace && ++n >= 1) {
          var p = R.hooks.pace(E.t);
          if (p) return p.then(loop);
        }
      }
      return Promise.resolve();
    }
    return loop();
  };
  Runner.prototype.run = function (prog) {
    var R = this;
    return Promise.resolve().then(function () { return prog(R.api()); })
      .then(function () { R.done = true; }, function (e) {
        if (e && e.message === '__stopped__') { R.done = true; return; }
        R.error = e; R.done = true;
      });
  };
  Runner.prototype.stop = function () { this.stopped = true; };

  var API = { PHYS: PHYS, Engine: Engine, Runner: Runner, CAR: CAR, SCENES: SCENES, buildScene: buildScene, hashStr: hashStr, mulberry32: mulberry32, COST: COST };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.F1Sim = API;
})(this);
