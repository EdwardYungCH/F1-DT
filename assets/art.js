/* =====================================================================
   中一 DT — 動態插圖（感應器讀數、轉彎方式、巡線圖、流程圖）
   ===================================================================== */
(function () {
  'use strict';
  var INK = '#2b3d52', MUTED = '#5f6f82', BLUE = '#1e6fd9', GREEN = '#1f9d55', RED = '#d63a3a', ORANGE = '#e08600', GREY = '#9aa7b5', PCB = '#2e8b57';
  var FONT = 'font-family="Noto Sans TC,PingFang HK,Microsoft JhengHei,sans-serif"';
  var uid = 0;
  function t(x, y, s, size, fill, anchor, weight) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" fill="' + (fill || INK) + '" text-anchor="' + (anchor || 'middle') + '" font-weight="' + (weight || 700) + '" ' + FONT + '>' + s + '</text>';
  }
  function markers(p) {
    var out = '<defs>';
    [['g', GREEN], ['r', RED], ['k', INK], ['b', BLUE], ['o', ORANGE], ['m', MUTED]].forEach(function (m) {
      out += '<marker id="' + p + m[0] + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="' + m[1] + '"/></marker>';
    });
    return out + '</defs>';
  }

  /* ---------- 感應器讀數（由上望車頭，黑線穿過） ----------
     p = [L2, L1, M, R1, R2]，值為 0 / 1 / null（本課未使用） */
  var SX = [-92, -32, 0, 32, 92], SN = ['L2', 'L1', 'M', 'R1', 'R2'];
  function sensorView(p, o) {
    o = o || {};
    var W = 300, H = 150, cx = 150, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="感應器讀數 ' + p.map(function (v) { return v == null ? '–' : v; }).join(' ') + '">';
    s += '<rect width="' + W + '" height="' + H + '" rx="14" fill="#fff"/>';
    var ones = [], used = [];
    p.forEach(function (v, i) { if (v != null) used.push(i); if (v === 1) ones.push(i); });
    var showLine = o.line !== false;
    if (showLine) {
      var mid = [1, 2, 3].every(function (i) { return p[i] === 1; });
      if (mid && p[0] !== 0 && p[4] !== 0) {               // 橫線／交叉路口
        s += '<rect x="0" y="62" width="' + W + '" height="32" fill="#1d1f22"/><rect x="' + (cx - 16) + '" y="0" width="32" height="' + H + '" fill="#1d1f22"/>';
      } else if (ones.length === 2 && p[1] === 1 && p[3] === 1 && p[2] === 0) {   // 兩條線
        s += '<rect x="' + (cx + SX[1] - 14) + '" y="0" width="28" height="' + H + '" fill="#1d1f22"/><rect x="' + (cx + SX[3] - 14) + '" y="0" width="28" height="' + H + '" fill="#1d1f22"/>';
      } else if (ones.length) {
        var lo = SX[ones[0]], hi = SX[ones[ones.length - 1]];
        var w = Math.max(30, hi - lo + 22), c = (lo + hi) / 2;
        s += '<rect x="' + (cx + c - w / 2) + '" y="0" width="' + w + '" height="' + H + '" fill="#1d1f22"/>';
      } else {
        s += t(cx, 140, '（黑線不在感應器下面）', 11, MUTED, 'middle', 500);
      }
    }
    s += '<path d="M' + (cx - 104) + ' ' + H + ' V48 Q' + (cx - 104) + ' 20 ' + (cx - 76) + ' 20 H' + (cx + 76) + ' Q' + (cx + 104) + ' 20 ' + (cx + 104) + ' 48 V' + H + '" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
    s += '<path d="M' + cx + ' 28 l-7 9 h14 z" fill="' + INK + '"/>';
    s += '<rect x="' + (cx - 96) + '" y="56" width="192" height="44" rx="10" fill="' + PCB + '" fill-opacity="0.16" stroke="' + PCB + '" stroke-width="1.5"/>';
    for (var i = 0; i < 5; i++) {
      var x = cx + SX[i], v = p[i];
      if (v == null) { s += '<circle cx="' + x + '" cy="78" r="11" fill="#d5dde6" stroke="#fff" stroke-width="2"/>' + t(x, 82, '–', 11, '#8a97a5'); }
      else if (v === 1) { s += '<circle cx="' + x + '" cy="78" r="16" fill="#ff5a4f" opacity=".35"/><circle cx="' + x + '" cy="78" r="11" fill="#1b1b1b" stroke="#ffb3ad" stroke-width="2.5"/>' + t(x, 82.5, '1', 12, '#ffd479'); }
      else { s += '<circle cx="' + x + '" cy="78" r="11" fill="#fff" stroke="#b9c6d4" stroke-width="2"/>' + t(x, 82.5, '0', 12, INK); }
      s += '<rect x="' + (x - 14) + '" y="105" width="28" height="18" rx="4" fill="#fff" opacity=".92"/>' + t(x, 118, SN[i], 11.5, INK);
    }
    s += t(14, 140, '↑ 車頭', 11, MUTED, 'start', 500);
    return s + '</svg>';
  }

  /* ---------- 三種轉彎方式（俯視小車、車輪箭頭、旋轉中心） ---------- */
  function car(ghost) {
    return '<g' + (ghost ? ' opacity="0.22"' : '') + '><rect x="-40" y="-17" width="11" height="32" rx="3.5" fill="' + INK + '"/><rect x="29" y="-17" width="11" height="32" rx="3.5" fill="' + INK + '"/>' +
      '<rect x="-27" y="-36" width="54" height="70" rx="12" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><rect x="-19" y="-31" width="38" height="7" rx="3.5" fill="' + PCB + '"/>' +
      '<rect x="-13" y="-14" width="26" height="22" rx="3" fill="#dfe8f3" stroke="#9fb3c8" stroke-width="1.5"/><path d="M0 -21 l-5 6 h10 z" fill="' + INK + '"/></g>';
  }
  function wheelArrow(p, side, kind, len) {
    var x = side * 54;
    if (kind === 'stop') return '<rect x="' + (x - 7) + '" y="-7" width="14" height="14" rx="2" fill="' + GREY + '"/>';
    var c = kind === 'fwd' ? GREEN : RED, m = kind === 'fwd' ? 'g' : 'r';
    var y1 = kind === 'fwd' ? len / 2 : -len / 2, y2 = -y1;
    return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="5" stroke-linecap="round" marker-end="url(#' + p + m + ')"/>';
  }
  function turnPanel(mode, opt) {
    opt = opt || {};
    var p = 'tp' + (++uid) + '_', W = 280, H = 290, cx = 150, cy = 214, s = '', ox, oy, angs, lw, rw, labels = '';
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="轉彎方式 ' + mode + '">' + markers(p);
    s += '<rect width="' + W + '" height="' + H + '" rx="14" fill="#f6f8fb"/>';
    for (var gx = 20; gx < W; gx += 40) s += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '" stroke="#e6ecf3"/>';
    for (var gy = 20; gy < H; gy += 40) s += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="#e6ecf3"/>';
    if (mode === 1) {
      var R = 210; ox = cx - R; oy = cy; angs = [-12, -24];
      var ex = ox + R * Math.cos(Math.PI / 6), ey = oy - R * Math.sin(Math.PI / 6);
      s += '<path d="M' + cx + ' ' + cy + ' A' + R + ' ' + R + ' 0 0 0 ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '" fill="none" stroke="' + BLUE + '" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#' + p + 'b)"/>';
      angs.forEach(function (a) { s += '<g transform="rotate(' + a + ' ' + ox + ' ' + oy + ') translate(' + cx + ' ' + cy + ')">' + car(true) + '</g>'; });
      s += '<line x1="' + (cx - 46) + '" y1="' + (cy + 52) + '" x2="10" y2="' + (cy + 52) + '" stroke="' + RED + '" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#' + p + 'r)"/>';
      labels += t(opt.mirror ? W - 72 : 72, cy + 70, opt.mirror ? '圓心在很遠的右方' : '圓心在很遠的左方', 12, RED);
      lw = ['fwd', 20]; rw = ['fwd', 40];
    } else if (mode === 2) {
      ox = cx - 34.5; oy = cy; angs = [-40, -80];
      s += '<path d="M' + cx + ' ' + (cy - 44) + ' A44 44 0 0 0 ' + (ox - 6).toFixed(1) + ' ' + (oy - 56).toFixed(1) + '" fill="none" stroke="' + ORANGE + '" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#' + p + 'o)"/>';
      angs.forEach(function (a) { s += '<g transform="rotate(' + a + ' ' + ox + ' ' + oy + ') translate(' + cx + ' ' + cy + ')">' + car(true) + '</g>'; });
      lw = ['stop', 0]; rw = ['fwd', 34];
    } else {
      ox = cx; oy = cy; angs = [-30, -60];
      angs.forEach(function (a) { s += '<g transform="rotate(' + a + ' ' + ox + ' ' + oy + ') translate(' + cx + ' ' + cy + ')">' + car(true) + '</g>'; });
      s += '<path d="M' + (cx + 52) + ' ' + (cy - 30) + ' A60 60 0 0 0 ' + (cx - 30) + ' ' + (cy - 52) + '" fill="none" stroke="' + RED + '" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#' + p + 'r)"/>';
      lw = ['back', 30]; rw = ['fwd', 30];
    }
    s += '<g transform="translate(' + cx + ' ' + cy + ')">' + car(false) + wheelArrow(p, -1, lw[0], lw[1] || 34) + wheelArrow(p, 1, rw[0], rw[1] || 34) + '</g>';
    if (mode !== 1) {
      s += '<circle cx="' + ox + '" cy="' + oy + '" r="6" fill="' + RED + '" stroke="#fff" stroke-width="2"/>';
      s += '<line x1="' + ox + '" y1="' + (oy + 8) + '" x2="' + ox + '" y2="' + (oy + 44) + '" stroke="' + RED + '" stroke-width="1.5" stroke-dasharray="3 3"/>';
      labels += t(opt.mirror ? W - ox : ox, oy + 60, '● 圓心', 12, RED);
    }
    var names = { fwd: '前進', back: '後退', stop: '停止' };
    function lab(w) { return names[w[0]] + (mode === 1 ? (w[1] === 20 ? '（慢）' : '（快）') : ''); }
    function col(w) { return w[0] === 'back' ? RED : w[0] === 'stop' ? MUTED : GREEN; }
    var L = opt.mirror ? rw : lw, Rr = opt.mirror ? lw : rw;
    labels += t(24, 26, '左輪：' + lab(L), 13, col(L), 'start') + t(W - 24, 26, '右輪：' + lab(Rr), 13, col(Rr), 'end');
    var head = s.slice(0, s.indexOf('</defs>') + 7), body = s.slice(s.indexOf('</defs>') + 7);
    if (opt.mirror) body = '<g transform="translate(' + W + ' 0) scale(-1 1)">' + body + '</g>';
    return head + body + labels + '</svg>';
  }

  /* ---------- 巡線圖（用模擬器的同一組座標） ---------- */
  function trackMap(id, o) {
    o = o || {};
    if (!window.F1Sim) return '';
    var sc = window.F1Sim.buildScene(id), v = sc.view, sx = 4;
    var W = (v.x1 - v.x0) * sx, H = (v.y1 - v.y0) * sx, p = 'tm' + (++uid) + '_';
    function X(x) { return ((x - v.x0) * sx).toFixed(1); } function Y(y) { return ((v.y1 - y) * sx).toFixed(1); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sc.name + '">' + markers(p);
    s += '<rect width="' + W + '" height="' + H + '" fill="#d9dee4"/>';
    var pp = sc.paper;
    s += '<rect x="' + X(pp.x0) + '" y="' + Y(pp.y1) + '" width="' + ((pp.x1 - pp.x0) * sx) + '" height="' + ((pp.y1 - pp.y0) * sx) + '" fill="#fdfdfb" stroke="#c5ccd4"/>';
    var d = sc.pts.map(function (q, i) { return (i ? 'L' : 'M') + X(q[0]) + ' ' + Y(q[1]); }).join(' ') + ' Z';
    s += '<path d="' + d + '" fill="none" stroke="#1d1f22" stroke-width="' + (sc.width * sx) + '" stroke-linejoin="round"/>';
    var N = sc.pts.length, s0 = sc.pts[sc.startIndex], s1 = sc.pts[(sc.startIndex + 6) % N];
    var a = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]), nx = -Math.sin(a), ny = Math.cos(a);
    s += '<line x1="' + X(s0[0] + nx * 5) + '" y1="' + Y(s0[1] + ny * 5) + '" x2="' + X(s0[0] - nx * 5) + '" y2="' + Y(s0[1] - ny * 5) + '" stroke="' + GREEN + '" stroke-width="6"/>';
    s += t(X(s0[0] - nx * 9), Y(s0[1] - ny * 9 - 1.2), '起點', 15, GREEN, nx < 0 ? 'start' : 'end');
    // 方向：黑線上的白色小箭咀
    for (var f = 0.08; f < 1; f += 0.16) {
      var i = Math.floor(N * f + sc.startIndex) % N, q = sc.pts[i], q2 = sc.pts[(i + 3) % N];
      var ang = Math.atan2(-(q2[1] - q[1]), q2[0] - q[0]) * 180 / Math.PI;
      s += '<path d="M-5 -4 L5 0 L-5 4 Z" fill="#fff" transform="translate(' + X(q[0]) + ' ' + Y(q[1]) + ') rotate(' + ang.toFixed(1) + ')"/>';
    }
    if (o.note) s += t(W / 2, H - 10, o.note, 15, MUTED, 'middle', 600);
    return s + '</svg>';
  }

  /* ---------- 流程圖符號 ---------- */
  var FC = { term: { f: '#e6f7ee', s: '#1f9d55' }, proc: { f: '#eef4fc', s: '#1e6fd9' }, io: { f: '#fff1e0', s: '#e08600' }, dec: { f: '#fdeaea', s: '#d63a3a' }, grey: { f: '#f3f5f8', s: '#7b8a9c' } };
  function fcText(cx, cy, lines, size, color) {
    var out = '', lh = size + 4, y0 = cy - ((lines.length - 1) * lh) / 2 + size * 0.36;
    lines.forEach(function (ln, i) { out += t(cx, (y0 + i * lh).toFixed(1), ln, size, color || INK, 'middle', 700); });
    return out;
  }
  function fcShape(kind, cx, cy, w, h, lines, o) {
    o = o || {};
    var c = FC[o.palette || kind] || FC.proc, f = o.fill || c.f, st = o.stroke || c.s, dash = o.dash ? ' stroke-dasharray="7 5"' : '';
    var x = cx - w / 2, y = cy - h / 2, s = '';
    if (kind === 'term') s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="' + f + '" stroke="' + st + '" stroke-width="2.5"' + dash + '/>';
    else if (kind === 'io') { var k = 15; s += '<polygon points="' + (x + k) + ',' + y + ' ' + (x + w) + ',' + y + ' ' + (x + w - k) + ',' + (y + h) + ' ' + x + ',' + (y + h) + '" fill="' + f + '" stroke="' + st + '" stroke-width="2.5"' + dash + '/>'; }
    else if (kind === 'dec') s += '<polygon points="' + cx + ',' + y + ' ' + (x + w) + ',' + cy + ' ' + cx + ',' + (y + h) + ' ' + x + ',' + cy + '" fill="' + f + '" stroke="' + st + '" stroke-width="2.5"' + dash + '/>';
    else s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + f + '" stroke="' + st + '" stroke-width="2.5"' + dash + '/>';
    return s + fcText(cx, cy, lines, o.size || 13, o.tcolor);
  }
  function fcArrow(p, pts, label, lx, ly) {
    return '<polyline points="' + pts + '" fill="none" stroke="#5b6b7d" stroke-width="2.2" marker-end="url(#' + p + 'k)"/>' +
      (label ? t(lx, ly, label, 13, '#14509e', 'start', 800) : '');
  }
  function fcLine(pts) { return '<polyline points="' + pts + '" fill="none" stroke="#5b6b7d" stroke-width="2.2"/>'; }
  function fcNum(cx, cy, n, color) { return '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="' + (color || '#3e3090') + '"/>' + t(cx, cy + 4.5, n, 13, '#fff'); }

  window.F1Art = { sensorView: sensorView, turnPanel: turnPanel, trackMap: trackMap, fcShape: fcShape, fcArrow: fcArrow, fcLine: fcLine, fcNum: fcNum, markers: markers, text: t, uid: function () { return ++uid; } };
})();
