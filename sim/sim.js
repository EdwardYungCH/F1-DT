/* =====================================================================
   F1 DT 麥昆小車模擬器 — 介面及控制
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var Q = new URLSearchParams(location.search);
  var EMBED = Q.get('embed') === '1';
  if (EMBED) document.body.classList.add('embed');

  /* ---------- 學生身份（用來決定每部「小車」的少少差異） ---------- */
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var stu = store('f1dt:student') || {};
  var SEED = Q.get('seed') || ((stu.cls || '') + '-' + (stu.num || '')) || 'guest';
  if (SEED === '-') SEED = 'guest';

  /* ---------- 任務 ---------- */
  var MIS = window.F1Missions;
  var mid = MIS[Q.get('m')] ? Q.get('m') : 'free';
  var only = Q.get('only');                       // 課堂頁可以限制只顯示某幾個任務
  var sel = $('#mission');
  Object.keys(MIS).forEach(function (k) {
    if (only && only.split(',').indexOf(k) < 0 && k !== mid) return;
    var m = MIS[k], o = document.createElement('option');
    o.value = k; o.textContent = (m.lesson ? '第' + '一二三'[m.lesson - 1] + '堂｜' : '') + m.title;
    sel.appendChild(o);
  });
  sel.value = mid;
  sel.onchange = function () { saveProg(); switchMission(sel.value); };

  /* ---------- Blockly ---------- */
  var theme = Blockly.Theme.defineTheme('f1', {
    base: Blockly.Themes.Classic,
    componentStyles: { workspaceBackgroundColour: '#f6f8fb', toolboxBackgroundColour: '#ffffff', flyoutBackgroundColour: '#eef2f6', flyoutOpacity: 1, scrollbarColour: '#c5d0dc', insertionMarkerColour: '#000', insertionMarkerOpacity: 0.25 },
    fontStyle: { family: '"Noto Sans TC","PingFang HK","Microsoft JhengHei",sans-serif', weight: '600', size: 12 }
  });
  var ws = null;
  function makeWorkspace(level) {
    if (ws) ws.dispose();
    ws = Blockly.inject('blockly', {
      toolbox: window.F1Toolbox(level), theme: theme, renderer: 'thrasos', media: 'blockly/media/',
      grid: { spacing: 24, length: 2, colour: '#dfe6ee', snap: true }, trashcan: true, sounds: false,
      zoom: { controls: true, wheel: false, startScale: 0.95, maxScale: 1.8, minScale: 0.5, scaleSpeed: 1.15 },
      move: { scrollbars: true, drag: true, wheel: true }
    });
    ws.addChangeListener(function (e) {
      if (e.isUiEvent) return;
      clearTimeout(saveT); saveT = setTimeout(saveProg, 400);
      if (!running) showIdleResult();
    });
  }
  var saveT = 0;
  function progKey(m) { return 'f1sim:prog:' + m; }
  function xmlText() { return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws)); }
  function saveProg() { if (ws) store(progKey(mid), xmlText()); }
  function loadXml(text) {
    ws.clear();
    try { Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(text), ws); } catch (e) { console.warn(e); }
    ws.scrollCenter && setTimeout(function () { try { ws.scroll(0, 0); } catch (e) {} }, 0);
  }

  /* ---------- 物理引擎 ---------- */
  var E = null, sceneId = 'oval';
  function switchMission(m) {
    mid = m; var M = MIS[m];
    var newQ = new URLSearchParams(location.search); newQ.set('m', m); history.replaceState(null, '', '?' + newQ.toString());
    makeWorkspace(M.level);
    var saved = store(progKey(m));
    if (!saved && m === 'l3tier') saved = store(progKey('l3lap'));
    loadXml(saved || M.starter);
    $('#sceneSel').hidden = !M.free;
    setScene(M.free ? ($('#scene').value || 'oval') : M.scene);
    $('#goal').innerHTML = '<b>' + M.title + '</b>　' + M.goal + (M.starterNote ? '<span class="note">' + M.starterNote + '</span>' : '');
    stopRun(); lastResult = null; clearLog();
    showIdleResult();
  }
  function setScene(id) {
    sceneId = id;
    E = new F1Sim.Engine({ scene: id, seed: SEED, realism: $('#realism').checked });
    $('#hudScene').textContent = E.scene.name;
    resize(); draw();
  }
  $('#scene').onchange = function () { setScene($('#scene').value); };
  $('#realism').onchange = function () { stopRun(); E.setRealism($('#realism').checked); draw(); showIdleResult(); };

  /* ---------- 畫圖 ---------- */
  var cv = $('#stage'), ctx = cv.getContext('2d'), DPR = 1, follow = false;
  var trackCanvas = null;
  function resize() {
    var r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(10, Math.round(r.width * DPR)); cv.height = Math.max(10, Math.round(r.height * DPR));
    trackCanvas = null;
  }
  window.addEventListener('resize', function () { resize(); draw(); });
  function view() {
    var v = E.scene.view, W = cv.width, H = cv.height;
    if (follow) {
      var c = E.car, span = 46;
      v = { x0: c.x - span / 2, x1: c.x + span / 2, y0: c.y - span / 2, y1: c.y + span / 2 };
    }
    var s = Math.min(W / (v.x1 - v.x0), H / (v.y1 - v.y0));
    var ox = (W - s * (v.x1 - v.x0)) / 2 - v.x0 * s, oy = (H + s * (v.y1 - v.y0)) / 2 + v.y0 * s;
    return { s: s, tx: function (x) { return ox + x * s; }, ty: function (y) { return oy - y * s; } };
  }
  function drawScene(V) {
    var sc = E.scene, W = cv.width, H = cv.height;
    if (sc.kind === 'tiles') {
      ctx.fillStyle = '#ece6da'; ctx.fillRect(0, 0, W, H);
      var t = sc.tile, x0 = Math.floor((V.tx(0) * 0 + -200) / t) * t;
      ctx.strokeStyle = '#d2c7b4'; ctx.lineWidth = Math.max(1, 0.6 * V.s);
      for (var gx = -240; gx <= 300; gx += t) { ctx.beginPath(); ctx.moveTo(V.tx(gx), V.ty(-300)); ctx.lineTo(V.tx(gx), V.ty(300)); ctx.stroke(); }
      for (var gy = -240; gy <= 300; gy += t) { ctx.beginPath(); ctx.moveTo(V.tx(-300), V.ty(gy)); ctx.lineTo(V.tx(300), V.ty(gy)); ctx.stroke(); }
      // 起點膠紙
      ctx.strokeStyle = '#2f80ed'; ctx.lineWidth = Math.max(2, 1.2 * V.s);
      ctx.beginPath(); ctx.moveTo(V.tx(-8), V.ty(sc.start.y + 7.6)); ctx.lineTo(V.tx(8), V.ty(sc.start.y + 7.6)); ctx.stroke();
      ctx.fillStyle = '#2f80ed'; ctx.font = (12 * DPR) + 'px sans-serif'; ctx.fillText('起點', V.tx(9), V.ty(sc.start.y + 6.5));
      // 尺
      ctx.fillStyle = '#8a7f6c'; ctx.font = (11 * DPR) + 'px sans-serif';
      for (var k = 0; k <= 60; k += 20) ctx.fillText(k + ' cm', V.tx(k) + 3, V.ty(-3));
      return;
    }
    ctx.fillStyle = '#d9dee4'; ctx.fillRect(0, 0, W, H);
    var p = sc.paper;
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(V.tx(p.x0) + 4, V.ty(p.y1) + 4, (p.x1 - p.x0) * V.s, (p.y1 - p.y0) * V.s);
    ctx.fillStyle = '#fdfdfb'; ctx.fillRect(V.tx(p.x0), V.ty(p.y1), (p.x1 - p.x0) * V.s, (p.y1 - p.y0) * V.s);
    ctx.strokeStyle = '#1d1f22'; ctx.lineWidth = sc.width * V.s; ctx.lineJoin = 'round';
    ctx.beginPath();
    sc.pts.forEach(function (q, i) { if (i) ctx.lineTo(V.tx(q[0]), V.ty(q[1])); else ctx.moveTo(V.tx(q[0]), V.ty(q[1])); });
    ctx.closePath(); ctx.stroke();
    // 起點標記
    var s0 = sc.pts[sc.startIndex], s1 = sc.pts[(sc.startIndex + 2) % sc.pts.length];
    var a = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]), nx = -Math.sin(a), ny = Math.cos(a);
    ctx.strokeStyle = '#1a8f4e'; ctx.lineWidth = Math.max(2, 0.8 * V.s);
    ctx.beginPath(); ctx.moveTo(V.tx(s0[0] + nx * 4), V.ty(s0[1] + ny * 4)); ctx.lineTo(V.tx(s0[0] - nx * 4), V.ty(s0[1] - ny * 4)); ctx.stroke();
  }
  function drawTrail(V) {
    var tr = E.trail; if (tr.length < 2) return;
    ctx.strokeStyle = 'rgba(230,126,34,.85)'; ctx.lineWidth = Math.max(1.5, 0.5 * V.s); ctx.lineJoin = 'round';
    ctx.beginPath(); tr.forEach(function (q, i) { if (i) ctx.lineTo(V.tx(q[0]), V.ty(q[1])); else ctx.moveTo(V.tx(q[0]), V.ty(q[1])); });
    ctx.lineTo(V.tx(E.car.x), V.ty(E.car.y)); ctx.stroke();
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawCar(V) {
    var c = E.car, CAR = F1Sim.CAR, s = V.s;
    ctx.save();
    ctx.translate(V.tx(c.x), V.ty(c.y)); ctx.rotate(-c.h + Math.PI / 2);   // 之後：向上 = 車頭；單位 = 像素
    ctx.scale(s, s);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,.15)'; rr(-CAR.bodyHalfW + 0.5, -CAR.bodyFront + 0.8, CAR.bodyHalfW * 2, CAR.bodyFront - CAR.bodyBack, 2.2); ctx.fill();
    // 車輪
    ctx.fillStyle = '#26323e';
    rr(-CAR.track / 2 - 1.6, -2.4, 2.2, 4.8, 0.7); ctx.fill();
    rr(CAR.track / 2 - 0.6, -2.4, 2.2, 4.8, 0.7); ctx.fill();
    // 車身
    ctx.fillStyle = '#f7f9fb'; ctx.strokeStyle = '#2b3d52'; ctx.lineWidth = 0.35;
    rr(-CAR.bodyHalfW + 0.9, -CAR.bodyFront, (CAR.bodyHalfW - 0.9) * 2, CAR.bodyFront - CAR.bodyBack, 2); ctx.fill(); ctx.stroke();
    // micro:bit
    ctx.fillStyle = '#2b2f36'; rr(-2.6, -1.8, 5.2, 4.2, 0.5); ctx.fill();
    ctx.fillStyle = '#ff4d3d';
    var d = E.display;
    if (d) { for (var i = 0; i < 5; i++) for (var j = 0; j < 5; j++) if (glyph(d)[j][i]) ctx.fillRect(-1.9 + i * 0.85, -1.2 + j * 0.65, 0.42, 0.42); }
    // 前燈
    [[-2.6, E.leds.L], [2.6, E.leds.R]].forEach(function (L) {
      ctx.fillStyle = L[1] ? '#ff3b30' : '#8b9aa8';
      ctx.beginPath(); ctx.arc(L[0], -CAR.bodyFront + 1.1, 0.6, 0, 7); ctx.fill();
      if (L[1]) { ctx.fillStyle = 'rgba(255,59,48,.25)'; ctx.beginPath(); ctx.arc(L[0], -CAR.bodyFront + 1.1, 1.6, 0, 7); ctx.fill(); }
    });
    // 車底感應器（透視）
    for (var k = 0; k < 5; k++) {
      var lat = CAR.sensorLat[k], on = E.lastRead[k];
      ctx.fillStyle = on ? '#ff3b30' : 'rgba(46,139,87,.85)';
      ctx.beginPath(); ctx.arc(-lat, -CAR.sensorAhead, 0.55, 0, 7); ctx.fill();
      if (on) { ctx.fillStyle = 'rgba(255,59,48,.28)'; ctx.beginPath(); ctx.arc(-lat, -CAR.sensorAhead, 1.2, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawMeasure(V) {
    if (!measure) return;
    var s0 = E.scene.start, c = E.car;
    ctx.setLineDash([6 * DPR, 5 * DPR]); ctx.strokeStyle = '#1e6fd9'; ctx.lineWidth = 2 * DPR;
    ctx.beginPath(); ctx.moveTo(V.tx(s0.x), V.ty(s0.y)); ctx.lineTo(V.tx(c.x), V.ty(c.y)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#124b95'; ctx.font = 'bold ' + (13 * DPR) + 'px sans-serif';
    ctx.fillText(measure, V.tx((s0.x + c.x) / 2) + 8 * DPR, V.ty((s0.y + c.y) / 2));
  }
  var measure = '';
  function draw() {
    if (!E) return;
    var V = view();
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawScene(V); drawTrail(V); drawMeasure(V); drawCar(V);
    $('#hudTime').textContent = E.t.toFixed(1) + ' 秒';
    updateReadouts();
  }
  var GLYPH = {
    '0': ['01110', '10011', '10101', '11001', '01110'], '1': ['00100', '01100', '00100', '00100', '01110'],
    '2': ['11100', '00010', '01100', '10000', '11110'], '3': ['11110', '00010', '00100', '10010', '01100'],
    '4': ['00110', '01010', '10010', '11111', '00010'], '5': ['11111', '10000', '11110', '00001', '11110'],
    '6': ['00010', '00100', '01110', '10001', '01110'], '7': ['11111', '00010', '00100', '01000', '10000'],
    '8': ['01110', '10001', '01110', '10001', '01110'], '9': ['01110', '10001', '01110', '00100', '01000'],
    ok: ['00000', '00001', '00010', '10100', '01000'], '-': ['00000', '00000', '11111', '00000', '00000']
  };
  function glyph(d) {
    var g = GLYPH[d] || GLYPH[String(d).replace(/\.\d+$/, '').slice(-1)] || GLYPH['-'];
    return g.map(function (r) { return r.split('').map(Number); });
  }
  var LEDS = $('#leds');
  F1Sim.CAR.names.forEach(function (n, i) { var d = document.createElement('div'); d.className = 'led'; d.innerHTML = '<i>0</i>' + n; LEDS.appendChild(d); });
  var MAT = $('#matrix'); for (var mi = 0; mi < 25; mi++) MAT.appendChild(document.createElement('i'));
  function updateReadouts() {
    var used = usedSensors();
    Array.prototype.forEach.call(LEDS.children, function (el, i) {
      var v = E.lastRead[i]; el.classList.toggle('on', !!v); el.classList.toggle('off2', !used[i]); el.querySelector('i').textContent = v;
    });
    [['L', '#wL', '#wLv'], ['R', '#wR', '#wRv']].forEach(function (w) {
      var v = E.cmd[w[0]], el = $(w[1]), pct = Math.min(50, Math.abs(v) / 255 * 50);
      el.style.setProperty('--w', pct + '%'); el.style.setProperty('--x', v < 0 ? '-100%' : '0%'); el.style.setProperty('--c', v < 0 ? '#c43c2c' : '#1a8f4e');
      $(w[2]).textContent = v;
    });
    var g = E.display ? glyph(E.display) : null;
    Array.prototype.forEach.call(MAT.children, function (el, i) { el.classList.toggle('on', !!(g && g[Math.floor(i / 5)][i % 5])); });
  }
  var usedCache = null;
  function usedSensors() {
    if (usedCache) return usedCache;
    var u = [0, 0, 0, 0, 0];
    if (ws) ws.getAllBlocks(false).forEach(function (b) { if (b.type === 'f1_mq_line') u[+b.getFieldValue('S')] = 1; });
    return (usedCache = u);
  }

  /* ---------- 執行 ---------- */
  var running = false, runner = null, speed = 1, budgetEnd = 0, lastTs = 0, curBlock = null, shownBlock = null;
  var runInfo = null, lastResult = null;
  $('#speed').onchange = function () { speed = +$('#speed').value; };
  function pace(t) {
    if (t < budgetEnd) return null;
    return new Promise(function (res) {
      requestAnimationFrame(function (ts) {
        var dtw = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016; lastTs = ts;
        budgetEnd = t + dtw * speed;
        frame(); res();
      });
    });
  }
  function frame() {
    if (curBlock !== shownBlock && ws) { try { ws.highlightBlock(curBlock); } catch (e) {} shownBlock = curBlock; }
    draw(); monitor();
  }
  function log(msg, err) { var li = document.createElement('li'); li.textContent = msg; if (err) li.className = 'err'; $('#log').appendChild(li); }
  function clearLog() { $('#log').innerHTML = ''; }

  function validate() {
    var a = window.F1Gen.analyse(ws), errs = [], warns = [];
    if (a.starts.length > 1) errs.push('只可以有一個「當啟動時」。');
    if (a.forevers.length > 1) errs.push('只可以有一個「重複無限次」。');
    if (!a.starts.length && !a.forevers.length) errs.push('程式要放在「當啟動時」或「重復無限次」入面。'.replace('重復', '重複'));
    if (a.loose.length) warns.push('有 ' + a.loose.length + ' 組積木沒有放入「當啟動時」或「重複無限次」，不會執行（MakeCode 會把它們變灰）。');
    var hasInit = ws.getAllBlocks(false).some(function (b) { return b.type === 'f1_mq_init' && b.getRootBlock().type === 'f1_on_start'; });
    if (!hasInit) warns.push('沒有在「當啟動時」加入「初始化麥昆Plus」。');
    // 空的輸入
    ws.getAllBlocks(false).forEach(function (b) {
      if (b.type === 'controls_if') { var k = 0; while (b.getInput('IF' + k)) { if (!b.getInputTargetBlock('IF' + k)) warns.push('有一個「如果」沒有填條件，會當作「否」。'); k++; } }
    });
    return { a: a, errs: errs, warns: warns };
  }

  function startRun() {
    if (running) return;
    var v = validate();
    clearLog(); measure = '';
    v.warns.forEach(function (w) { log(w); });
    if (v.errs.length) { v.errs.forEach(function (w) { log(w, true); }); setResult('fail', '程式有問題', v.errs.join(' ')); return; }
    var gen = window.F1Gen.simCode(ws), prog;
    try { prog = new Function(gen.code)(); } catch (e) { setResult('fail', '程式無法執行', String(e)); return; }
    usedCache = null;
    E.reset();
    runInfo = { maxFwd: 0, stoppedFor: 0, xml: xmlText(), ts: window.F1Gen.tsCode(ws), startT: Date.now(), done: false, ended: false };
    runner = new F1Sim.Runner(E, {
      pace: pace,
      highlight: function (id) { curBlock = id; },
      display: function () {}
    });
    runner.limit = 300;
    running = true; budgetEnd = 0; lastTs = 0;
    $('#btnRun').disabled = true; $('#btnStop').disabled = false;
    setResult('info', '執行中…', MIS[mid].check === 'lap' || MIS[mid].check === 'tier' ? '小車正在巡線，留意感應器讀數。' : '');
    runner.run(prog).then(function () {
      if (runner && runner.error) { log('程式錯誤：' + runner.error.message, true); finish('fail', '程式出錯', String(runner.error.message)); return; }
      if (!running) return;
      runInfo.done = true;
      settle();
    });
  }
  // 程式完結（沒有「重複無限次」）後，讓小車慢慢停定才評分
  function settle() {
    var t0 = E.t;
    function loop() {
      if (!running) return;
      var go = runner && !runner.stopped;
      for (var i = 0; i < 40; i++) E.step(0.001);
      draw();
      if (E.moving() && E.t - t0 < 3) requestAnimationFrame(loop);
      else evaluateEnd();
    }
    curBlock = null; try { ws.highlightBlock(null); } catch (e) {}
    loop();
  }
  function monitor() {
    if (!running) return;
    runInfo.maxFwd = Math.max(runInfo.maxFwd, E.cmd.L, E.cmd.R);
    var M = MIS[mid];
    E.events.splice(0).forEach(function (ev) {
      if (ev.type === 'warn') log(ev.msg, true);
      if (ev.type === 'lap') log('完成第 ' + ev.lap + ' 圈：' + ev.time.toFixed(1) + ' 秒');
    });
    if (E.scene.kind === 'track') {
      if (E.prog.laps >= 1 && (M.check === 'lap' || M.check === 'tier' || M.free)) { evaluateLap(); return; }
      if (E.warnings.offpaper) { finish('fail', '衝出了巡線圖', '小車離開了紙張範圍。試試降低速度，或者檢查修正方向有沒有調反。'); return; }
      var still = !E.moving() && E.cmd.L === 0 && E.cmd.R === 0 && E.t > 2.5;
      if (still) { if (runInfo.stillSince == null) runInfo.stillSince = E.t; } else runInfo.stillSince = null;
      if (still && E.t > 3 && E.t - runInfo.stillSince > 0.5 && E.inited) {
        var r = E.lastRead.join('');
        finish('fail', '小車停了下來', '感應器讀數是 ' + r.slice(1, 4) + '（L1 M R1）。三個都讀到 0，程式走到「否則 → 停止」：小車已經脫線。' + hintFor());
        return;
      }
      if (E.offLineTime > 2) { finish('fail', '脫線了', '小車已經離開黑線很遠。' + hintFor()); return; }
    }
    else if (M.check === 'line' || M.check === 'turn' || M.check === 'square') {
      if (E.distance > 700 || E.t > 90) { finish('fail', '小車停不下來', '程式可能放了在「重複無限次」內，或者忘記「設置全部馬達 停止」。這個任務要用「當啟動時」。'); return; }
    }
    if (runner && runner.timeout) finish('fail', '時間到', '模擬了 5 分鐘仍未完成。');
  }
  function hintFor() {
    var xml = runInfo.xml;
    var stopCorr = /f1_mq_stop"[^>]*><field name="M">[LR]</.test(xml);
    if (stopCorr) return ' 提示：修正時用了「一邊停」。試試改成「一邊後退」。';
    if (runInfo.maxFwd >= 70) return ' 提示：速度可能太快了，試試降低直行速度。';
    return ' 提示：檢查「向左修正」和「向右修正」有沒有調轉。';
  }
  function evaluateEnd() {
    var M = MIS[mid], s0 = E.scene.start, c = E.car;
    var dx = c.x - s0.x, dy = c.y - s0.y, dist = Math.hypot(dx, dy);
    var turn = E.turned * 180 / Math.PI, abs = Math.abs(turn);
    var fwd = dx * Math.cos(s0.h) + dy * Math.sin(s0.h);
    if ((M.check === 'line' || M.check === 'turn' || M.check === 'square') && (E.cmd.L || E.cmd.R)) {
      measure = '';
      return finish('fail', '程式完結了，但馬達仍然轉動', '馬達不會自己停！最後要加「設置全部馬達 停止」。（真車會一直向前衝。）');
    }
    if (M.check === 'line') {
      measure = fwd.toFixed(1) + ' cm';
      if (E.distance < 1) return finish('fail', '小車沒有移動', '記得：先「初始化麥昆Plus」，再「設置全部馬達 前進」。');
      if (fwd < 5) return finish('fail', '方向不對', '小車沒有向前直行。');
      return finish('pass', '完成直線測試', '小車向前走了 ' + fwd.toFixed(1) + ' cm。把這個數字填入課堂頁的計算器。', { distance: +fwd.toFixed(1), drift: +((-dx * Math.sin(s0.h) + dy * Math.cos(s0.h))).toFixed(1) });
    }
    if (M.check === 'turn') {
      measure = '';
      var dirTxt = turn < 0 ? '向右' : '向左';
      var stats = { angle: +abs.toFixed(1), dir: turn < 0 ? 'R' : 'L', moved: +dist.toFixed(1) };
      if (abs < 3) return finish('fail', '小車沒有轉', '記得左輪和右輪要一前一後。', stats);
      if (Math.abs(abs - 90) <= 8) return finish('pass', '轉了 ' + abs.toFixed(0) + '°（' + dirTxt + '）', '剛好！記下你用的暫停時間。', stats);
      return finish('fail', '轉了 ' + abs.toFixed(0) + '°（' + dirTxt + '）', abs < 90 ? '轉得太少：暫停時間加多一點（例如 +50 ms）。' : '轉得太多：暫停時間減少一點（例如 −50 ms）。', stats);
    }
    if (M.check === 'square') {
      var hErr = ((turn % 360) + 540) % 360 - 180;
      hErr = Math.abs(Math.abs(hErr) > 90 ? 180 - Math.abs(hErr) : hErr);
      var head = Math.abs(((turn + 180) % 360 + 360) % 360 - 180);
      var usedRepeat = ws.getAllBlocks(false).some(function (b) { return b.type === 'f1_repeat'; });
      measure = '離起點 ' + dist.toFixed(1) + ' cm';
      var st = { closure: +dist.toFixed(1), heading: +head.toFixed(0), path: +E.distance.toFixed(0), turned: +abs.toFixed(0), repeat: usedRepeat };
      if (E.distance < 150) return finish('fail', '未走完四條邊', '只走了 ' + E.distance.toFixed(0) + ' cm。一格地磚正方形大約要走 240 cm。', st);
      if (!usedRepeat) return finish('fail', '未用「重複 4 次」', '路線差不多了，但要用「重複 4 次」，不要抄 4 次積木。', st);
      if (dist <= 15 && head <= 15) return finish('pass', '正方形完成！', '回到起點附近（相差 ' + dist.toFixed(1) + ' cm），車頭偏差 ' + head.toFixed(0) + '°。', st);
      return finish('fail', '未回到起點', '相差 ' + dist.toFixed(1) + ' cm，車頭偏差 ' + head.toFixed(0) + '°。' + (abs < 330 ? '轉彎太少：每次轉彎的暫停時間要加長。' : abs > 390 ? '轉彎太多：每次轉彎的暫停時間要縮短。' : '直行時間可能要調整。'), st);
    }
    if (M.check === 'lap' || M.check === 'tier') {
      return finish('fail', '程式完結了', '巡線程式要放在「重複無限次」內，令小車不停感知。');
    }
    finish('info', '程式完結', '');
  }
  function evaluateLap() {
    var M = MIS[mid], u = usedSensors();
    var st = { lap: +E.lapTimes[0].toFixed(1), sharp: E.sharpTurns, maxSpeed: runInfo.maxFwd, uses: u.join('') };
    var stopCorr = /f1_mq_stop"[^>]*><field name="M">[LR]</.test(runInfo.xml);
    var backCorr = /<field name="D">-1<\/field>/.test(runInfo.xml);
    st.method = stopCorr && backCorr ? 'mixed' : stopCorr ? 'stop' : backCorr ? 'back' : 'other';
    if (M.check === 'tier') {
      if (!u[0] || !u[4]) return finish('fail', '完成一圈，但未用 L2、R2', '分層修正要加入 L2 及 R2 的判斷。', st);
      if (runInfo.maxFwd < M.minSpeed) return finish('fail', '完成一圈，但速度太慢', '直行速度要 ' + M.minSpeed + ' 或以上（今次最高 ' + runInfo.maxFwd + '）。', st);
      if (E.sharpTurns > M.maxSharp) return finish('fail', '完成一圈，但急轉太多', '急轉 ' + E.sharpTurns + ' 次（要 ≤ ' + M.maxSharp + '）。L1／R1 試試用「一邊停」，只在 L2／R2 才「一邊後退」。', st);
      return finish('pass', '分層修正成功！', '圈速 ' + st.lap + ' 秒，急轉只有 ' + st.sharp + ' 次。', st);
    }
    finish('pass', '完成一整圈！', '圈速 ' + st.lap + ' 秒；最高直行速度 ' + st.maxSpeed + '；急轉 ' + st.sharp + ' 次。', st);
  }
  function finish(kind, title, msg, stats) {
    if (!running && kind !== 'info') { /* 已停 */ }
    var realism = $('#realism').checked;
    running = false;
    if (runner) runner.stop();
    curBlock = null; try { ws.highlightBlock(null); } catch (e) {}
    $('#btnRun').disabled = false; $('#btnStop').disabled = true;
    draw();
    var M = MIS[mid];
    var extra = '';
    if (stats) {
      var lab = { distance: '前進距離 (cm)', angle: '轉動角度 (°)', closure: '離起點 (cm)', heading: '車頭偏差 (°)', lap: '圈速 (秒)', sharp: '急轉次數', maxSpeed: '最高速度' };
      extra = '<div class="stats">' + Object.keys(lab).filter(function (k) { return stats[k] !== undefined; }).map(function (k) { return '<span>' + lab[k] + '：<b>' + stats[k] + '</b></span>'; }).join('') + '</div>';
    }
    var note = kind === 'pass' && !realism && M.check !== 'none' ? '<div class="stats">（已關閉「真實誤差」，這次結果不會計分）</div>' : '';
    setResult(kind, title, msg, extra + note);
    if (kind === 'pass' || kind === 'fail') record(kind === 'pass' && realism, title, stats || {});
  }
  function setResult(kind, title, msg, extra) {
    var r = $('#result'); r.className = 'result ' + (kind || '');
    r.innerHTML = '<h4>' + (kind === 'pass' ? '✔ ' : kind === 'fail' ? '✘ ' : '') + title + '</h4>' + (msg ? '<div>' + msg + '</div>' : '') + (extra || '');
  }
  function showIdleResult() {
    if (running) return;
    var M = MIS[mid], prev = store('f1sim:res:' + mid);
    if (prev && prev.pass) setResult('pass', '你已完成這個任務', '可以繼續改良程式，再執行一次。');
    else setResult('', '按「▶ 執行」開始', M.check === 'none' ? '' : '過關條件：' + M.goal);
  }
  function stopRun() {
    if (runner) runner.stop();
    running = false;
    curBlock = null; try { ws && ws.highlightBlock(null); } catch (e) {}
    $('#btnRun').disabled = false; $('#btnStop').disabled = true;
  }

  /* ---------- 記錄結果（交給課堂頁） ---------- */
  function record(pass, title, stats) {
    var key = 'f1sim:res:' + mid, prev = store(key) || { mission: mid, attempts: [] };
    var att = { t: Date.now(), pass: pass, title: title, stats: stats, realism: $('#realism').checked };
    prev.attempts = (prev.attempts || []).concat([att]).slice(-12);
    if (pass) { prev.pass = true; prev.best = prev.best && prev.best.stats && prev.best.stats.lap && stats.lap && prev.best.stats.lap < stats.lap ? prev.best : att; prev.xml = runInfo.xml; prev.ts = runInfo.ts; }
    prev.seed = SEED; prev.updated = Date.now();
    store(key, prev);
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'f1sim', mission: mid, result: prev, last: att }, '*'); } catch (e) {}
  }

  /* ---------- 按鈕 ---------- */
  $('#btnRun').onclick = function () { follow = follow; startRun(); };
  $('#btnStop').onclick = function () { if (running) finish('info', '已停止', ''); };
  $('#btnReset').onclick = function () { stopRun(); E.reset(); measure = ''; clearLog(); draw(); showIdleResult(); };
  $('#btnFollow').onclick = function () { follow = !follow; this.setAttribute('aria-pressed', follow); draw(); };
  $('#btnStarter').onclick = function () {
    dialog('載入起步程式？', '<p>你現在的積木會被取代。</p>', [{ t: '取消' }, { t: '載入', primary: true, f: function () { loadXml(MIS[mid].starter); } }]);
  };
  $('#btnClear').onclick = function () {
    dialog('清空所有積木？', '<p>這個動作可以用 Ctrl+Z 復原。</p>', [{ t: '取消' }, { t: '清空', primary: true, f: function () { ws.clear(); } }]);
  };
  $('#btnExport').onclick = function () {
    var ts = window.F1Gen.tsCode(ws);
    dialog('匯出到 MakeCode（真的小車）',
      '<ol><li>用 Chrome 開啟 <b>makecode.microbit.org</b> → 新專案，名稱照課堂頁的要求。</li>' +
      '<li>按「擴展」，貼上 <code>https://github.com/DFRobot/pxt-DFRobot_MaqueenPlus_v20</code>，選 <b>maqueenPlusV2</b>。</li>' +
      '<li>按畫面上方的「<b>JavaScript</b>」，全選舊內容，貼上下面的程式碼。</li>' +
      '<li>按「<b>積木</b>」切換回來，檢查積木和模擬器的一樣，然後下載到 micro:bit。</li></ol>' +
      '<pre id="tsCode"></pre><p style="font-size:13px;color:#55657a">真車的數值（例如轉 90° 的時間）要再試一次：模擬器的數字不會完全等於真車。</p>',
      [{ t: '關閉' }, { t: '複製程式碼', primary: true, keep: true, f: function (btn) {
        var txt = ts;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { btn.textContent = '已複製 ✓'; }, function () {
          var r = document.createRange(); r.selectNodeContents($('#tsCode')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = '已選取，按 Ctrl+C';
        });
      } }]);
    $('#tsCode').textContent = ts;
  };
  $('#btnHelp').onclick = function () {
    dialog('怎樣用模擬器？',
      '<ol><li>由左邊的指令群把積木拖到工作區，接駁好。</li>' +
      '<li>按「▶ 執行」：正在執行的積木會發亮，右邊會見到小車移動、感應器讀數及馬達速度。</li>' +
      '<li>「真實誤差」開啟時，每位同學的小車都有少少不同（電量、左右馬達），就好像真車一樣，要自己試驗修正。</li>' +
      '<li>完成任務後，結果會自動交到課堂頁；之後按「匯出到 MakeCode」，把同一個程式下載到真的小車。</li></ol>' +
      '<p>在 MakeCode 的積木名稱是「讀取<b>循跡</b>感測器」——和這裏一樣。</p>', [{ t: '明白', primary: true }]);
  };
  function dialog(title, html, btns) {
    $('#mTitle').textContent = title; $('#mBody').innerHTML = html;
    var act = $('#mAct'); act.innerHTML = '';
    btns.forEach(function (b) {
      var el = document.createElement('button'); el.type = 'button'; el.textContent = b.t; if (b.primary) el.className = 'primary';
      el.onclick = function () { if (b.f) b.f(el); if (!b.keep) $('#modal').hidden = true; };
      act.appendChild(el);
    });
    $('#modal').hidden = false;
  }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') $('#modal').hidden = true; });
  if (EMBED) { $('#brand').removeAttribute('href'); $('#brand').style.cursor = 'default'; }

  // 測試用
  window.F1SimApp = { get engine() { return E; }, get ws() { return ws; }, run: startRun, setSpeed: function (v) { speed = v; $('#speed').value = String(v); }, load: loadXml, mission: function () { return mid; } };

  switchMission(mid);
})();
