/* =====================================================================
   中一 DT「自動化與機械人」— 共用程式
   每一課只需要：F1.start({...}) 再用 F1.choice / F1.match / F1.fill … 建立練習。
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.F1CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stripTags(s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; }
  function shuffle(a, seed) {
    a = a.slice(); var r = mulberry(hash(seed || String(Math.random())));
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function fmtTime(t) { if (!t) return ''; var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  /* ---------- 儲存 ---------- */
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function clearAll() {
    try { Object.keys(localStorage).forEach(function (k) { if (/^f1(dt|sim):/.test(k) && k !== 'f1dt:prefs') localStorage.removeItem(k); }); } catch (e) {}
  }

  var F1 = window.F1 = { esc: esc, $: $, $$: $$, shuffle: shuffle, get: get, put: put, fmtTime: fmtTime, comps: [], cfg: CFG };
  var L = null, D = null, STU = null;     // 課堂設定、課堂狀態、學生資料

  function save(quiet) {
    D.lastActive = Date.now();
    put(L.key, D);
    if (!quiet) toast('已自動儲存 ✓');
    refresh();
  }
  F1.save = save;
  F1.state = function (k, init) { if (!D.items[k]) D.items[k] = init || {}; return D.items[k]; };

  /* ---------- 浮動提示、對話框 ---------- */
  var toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 1400);
  }
  F1.toast = toast;
  function dialog(o) {      // o: {title, html, buttons:[{t, kind, f, keep}], input:{placeholder,type}}
    return new Promise(function (resolve) {
      var m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.innerHTML = '<div class="box"><h3>' + esc(o.title) + '</h3><div class="body">' + (o.html || '') + '</div>' +
        (o.input ? '<input class="inp" style="margin-top:10px" type="' + (o.input.type || 'text') + '" placeholder="' + esc(o.input.placeholder || '') + '" autocomplete="off">' : '') +
        '<p class="err small" style="color:var(--no);min-height:1.2em;margin:6px 0 0"></p><div class="acts"></div></div>';
      var acts = $('.acts', m), inp = $('input', m);
      (o.buttons || [{ t: '明白', kind: 'primary' }]).forEach(function (b, i) {
        var el = document.createElement('button'); el.type = 'button'; el.className = 'btn ' + (b.kind || ''); el.textContent = b.t;
        el.onclick = function () {
          var val = inp ? inp.value : undefined;
          if (b.f) { var r = b.f(val, m); if (r === false) return; if (typeof r === 'string') { $('.err', m).textContent = r; return; } }
          close(i, val);
        };
        acts.appendChild(el);
      });
      function close(i, val) { m.remove(); document.removeEventListener('keydown', onKey); resolve({ i: i, value: val }); }
      function onKey(e) { if (e.key === 'Escape') close(-1); if (e.key === 'Enter' && inp && document.activeElement === inp) { var bs = $$('.acts .btn', m); bs[bs.length - 1].click(); } }
      document.addEventListener('keydown', onKey);
      document.body.appendChild(m);
      setTimeout(function () { (inp || $('.acts .btn:last-child', m)).focus(); }, 30);
    });
  }
  F1.dialog = dialog;
  function askPin(title) {
    return dialog({ title: title || '老師密碼', html: '<p>請老師輸入密碼。</p>', input: { type: 'password', placeholder: '密碼' },
      buttons: [{ t: '取消' }, { t: '確定', kind: 'primary', f: function (v) { if (v !== CFG.TEACHER_PIN) return '密碼不正確。'; } }] })
      .then(function (r) { return r.i === 1; });
  }
  F1.askPin = askPin;

  /* ---------- 底部選單（取代下拉選單） ---------- */
  function sheet(title, options, cur) {   // options: [{v, t}]
    return new Promise(function (resolve) {
      var s = document.createElement('div'); s.className = 'sheet';
      s.innerHTML = '<div class="box" role="listbox"><h4>' + esc(title) + '</h4></div>';
      var box = $('.box', s);
      options.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (String(o.v) === String(cur) ? ' cur' : ''); b.innerHTML = o.t;
        b.onclick = function () { done(o.v); }; box.appendChild(b);
      });
      var c = document.createElement('button'); c.type = 'button'; c.className = 'btn sm'; c.style.marginTop = '8px'; c.textContent = '取消'; c.onclick = function () { done(undefined); }; box.appendChild(c);
      s.addEventListener('click', function (e) { if (e.target === s) done(undefined); });
      function onKey(e) { if (e.key === 'Escape') done(undefined); }
      document.addEventListener('keydown', onKey);
      function done(v) { s.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
      document.body.appendChild(s);
      setTimeout(function () { ($('.choice.cur', s) || $('.choice', s)).focus(); }, 30);
    });
  }
  F1.sheet = sheet;

  /* ---------- 元件登記 ---------- */
  function reg(c) { c.counted = c.max > 0; F1.comps.push(c); return c; }
  F1.reg = reg;
  function scoreOf(c) { try { return Math.max(0, Math.min(c.max, c.score() || 0)); } catch (e) { return 0; } }
  function totals() {
    var s = 0, m = 0, done = 0, n = 0;
    F1.comps.forEach(function (c) { if (!c.counted) return; s += scoreOf(c); m += c.max; n++; if (c.done()) done++; });
    return { score: Math.round(s * 10) / 10, max: m, pct: m ? Math.round(s / m * 100) : 0, prog: n ? Math.round(done / n * 100) : 0 };
  }
  F1.totals = totals;
  function grade(p) { return p >= 85 ? '優異' : p >= 70 ? '良好' : p >= 50 ? '合格' : '仍需努力'; }
  F1.grade = grade;

  /* =====================================================================
     練習元件
     ===================================================================== */
  function fbHtml(ok, first, why, answerText) {
    return '<div class="fb ' + (ok ? 'ok' : 'no') + '"><span class="first">' +
      (first === null ? (ok ? '答對了！' : '再想想…') : first ? '第一次已答對 👍' : '第一次答錯了' + (answerText ? '：答案是「' + answerText + '」' : '')) +
      '</span>' + (why || '') + '</div>';
  }

  /* ---- 選擇題：卡片 (layout:'grid') 或 行 (layout:'rows') ---- */
  F1.choice = function (el, o) {
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { first: {} });
    var items = o.shuffle ? shuffle(o.items, o.key + (STU && STU.num || '')) : o.items;
    el.classList.add(o.layout === 'rows' ? 'qrows' : 'qgrid');
    items.forEach(function (it, idx) {
      var d = document.createElement('div'); d.className = o.layout === 'rows' ? 'qrow' + (it.pic ? '' : ' nopic') : 'qcard';
      var opts = it.options || o.options;
      d.innerHTML = (it.pic ? '<div class="pic">' + it.pic + '</div>' : '') +
        (o.layout === 'rows' ? '<div class="q">' + (idx + 1) + '. ' + (it.title || '') + '</div>' : '<h4>' + (idx + 1) + '. ' + (it.title || '') + '</h4>' + (it.en ? '<div class="en">' + esc(it.en) + '</div>' : '')) +
        '<div class="opts' + (opts.length === 2 ? ' two' : '') + '">' + opts.map(function (op) { return '<button type="button" class="opt" data-v="' + esc(op.v) + '">' + op.t + '</button>'; }).join('') + '</div>' +
        '<div class="fbx"></div>';
      $$('.opt', d).forEach(function (b) {
        b.onclick = function () {
          var v = b.getAttribute('data-v'), ok = v === String(it.answer);
          var firstTime = !(it.id in st.first);
          if (firstTime) st.first[it.id] = { ok: ok, v: v };
          $$('.opt', d).forEach(function (x) { x.classList.remove('is-right', 'is-wrong', 'is-answer'); });
          b.classList.add(ok ? 'is-right' : 'is-wrong');
          if (!ok) { var ans = $('.opt[data-v="' + String(it.answer).replace(/"/g, '\\"') + '"]', d); if (ans) ans.classList.add('is-answer'); }
          var ansT = opts.filter(function (x) { return String(x.v) === String(it.answer); })[0];
          $('.fbx', d).innerHTML = fbHtml(ok, firstTime ? null : st.first[it.id].ok, it.why, ansT ? stripTags(ansT.t) : '');
          save(); summary();
        };
      });
      if (it.id in st.first) {
        var f = st.first[it.id], b0 = $('.opt[data-v="' + String(f.v).replace(/"/g, '\\"') + '"]', d);
        if (b0) b0.classList.add(f.ok ? 'is-right' : 'is-wrong');
        if (!f.ok) { var a0 = $('.opt[data-v="' + String(it.answer).replace(/"/g, '\\"') + '"]', d); if (a0) a0.classList.add('is-answer'); }
        var aT = opts.filter(function (x) { return String(x.v) === String(it.answer); })[0];
        $('.fbx', d).innerHTML = fbHtml(f.ok, f.ok, it.why, aT ? stripTags(aT.t) : '');
      }
      el.appendChild(d);
    });
    var sum = document.createElement('div'); sum.className = 'res qsum'; el.after(sum);
    function summary() {
      var n = Object.keys(st.first).length;
      if (n < o.items.length) { sum.textContent = ''; return; }
      var c = o.items.filter(function (it) { return st.first[it.id] && st.first[it.id].ok; }).length;
      sum.className = 'res qsum' + (c === o.items.length ? ' good' : '');
      sum.innerHTML = '第一次作答成績：' + c + ' / ' + o.items.length + (o.after ? '　' + o.after : '');
    }
    summary();
    return reg({
      key: o.key, label: o.label, max: o.counted === false ? 0 : (o.max || o.items.length), sec: o.sec,
      score: function () { var c = o.items.filter(function (it) { return st.first[it.id] && st.first[it.id].ok; }).length; return o.max ? c / o.items.length * o.max : c; },
      done: function () { return Object.keys(st.first).length >= o.items.length; },
      report: function () {
        return { type: 'choice', rows: o.items.map(function (it, i) {
          var f = st.first[it.id]; var opts = it.options || o.options;
          var pick = f ? opts.filter(function (x) { return String(x.v) === String(f.v); })[0] : null;
          var ans = opts.filter(function (x) { return String(x.v) === String(it.answer); })[0];
          return { q: stripTags(it.rep || it.title || ('第 ' + (i + 1) + ' 題')), a: pick ? stripTags(pick.t) : '', ans: ans ? stripTags(ans.t) : '', ok: f ? f.ok : null };
        }) };
      }
    });
  };

  /* ---- 配對：每行按「選擇」→ 底部選單；按「檢查答案」 ---- */
  F1.match = function (el, o) {   // o: {key,label,head:[a,b], rows:[{html, answer:'value'}], options:[{v,t}], max}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { picked: {}, first: null });
    var opts = shuffle(o.options, o.key + 'x');
    var tw = document.createElement('div'); tw.className = 'tbl-wrap';
    tw.innerHTML = '<table class="mtable"><thead><tr><th style="width:38%">' + (o.head ? o.head[0] : '項目') + '</th><th>' + (o.head ? o.head[1] : '配對') + '</th><th class="c" style="width:3.5em">結果</th></tr></thead><tbody></tbody></table>';
    var tb = $('tbody', tw);
    o.rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + r.html + '</td><td><button type="button" class="pick"></button></td><td class="mark"></td>';
      var btn = $('.pick', tr);
      function paint() {
        var v = st.picked[i], op = opts.filter(function (x) { return String(x.v) === String(v); })[0];
        btn.innerHTML = op ? op.t : '— 按這裏選擇 —'; btn.classList.toggle('empty', !op);
        btn.classList.remove('is-right', 'is-wrong'); $('.mark', tr).textContent = ''; $('.mark', tr).className = 'mark';
      }
      btn.onclick = function () {
        sheet(r.label || stripTags(r.html).slice(0, 40), opts, st.picked[i]).then(function (v) { if (v === undefined) return; st.picked[i] = v; paint(); save(); if (o.onChange) o.onChange(st.picked, null); });
      };
      paint(); tr._paint = paint; tr._btn = btn;
      tb.appendChild(tr);
    });
    el.appendChild(tw);
    var row = document.createElement('div'); row.className = 'btnrow';
    row.innerHTML = '<button type="button" class="btn primary">檢查答案</button><button type="button" class="btn">清除重做</button>';
    el.appendChild(row);
    var res = document.createElement('div'); res.className = 'res'; el.appendChild(res);
    function check(silent) {
      var c = 0, blank = 0, marks = [];
      $$('tr', tb).forEach(function (tr, i) {
        var v = st.picked[i], ok = String(v) === String(o.rows[i].answer);
        marks[i] = (v === undefined || v === '') ? null : ok;
        if (v === undefined || v === '') { blank++; return; }
        if (ok) c++;
        tr._btn.classList.add(ok ? 'is-right' : 'is-wrong');
        var mk = $('.mark', tr); mk.textContent = ok ? '✔' : '✘'; mk.className = 'mark ' + (ok ? 'ok' : 'no');
      });
      if (o.onChange) o.onChange(st.picked, marks);
      if (blank) { res.className = 'res'; res.textContent = '還有 ' + blank + ' 題未選擇。'; return; }
      if (st.first === null && !silent) st.first = c;
      res.className = 'res' + (c === o.rows.length ? ' good' : '');
      res.innerHTML = '成績（以第一次檢查計）：' + (st.first === null ? c : st.first) + ' / ' + o.rows.length + '　今次答對 ' + c + ' / ' + o.rows.length + (c === o.rows.length ? '　全對！' : (o.hint ? '<br><span style="font-weight:500">' + o.hint + '</span>' : ''));
      if (!silent) save();
    }
    $$('.btn', row)[0].onclick = function () { check(false); };
    $$('.btn', row)[1].onclick = function () { st.picked = {}; $$('tr', tb).forEach(function (tr) { tr._paint(); }); res.textContent = ''; save(true); if (o.onChange) o.onChange(st.picked, null); };
    if (o.extraBtn) { var eb = document.createElement('button'); eb.type = 'button'; eb.className = 'btn ghost'; eb.textContent = o.extraBtn.t; eb.onclick = function () { o.extraBtn.f(st, function () { $$('tr', tb).forEach(function (tr) { tr._paint(); }); check(true); save(); }); }; row.appendChild(eb); }
    if (st.first !== null) check(true); else if (o.onChange) o.onChange(st.picked, null);
    return reg({
      key: o.key, label: o.label, max: o.max || o.rows.length, sec: o.sec,
      score: function () { return st.first === null ? 0 : (o.max ? st.first / o.rows.length * o.max : st.first); },
      done: function () { return st.first !== null; },
      report: function () {
        return { type: 'match', first: st.first, rows: o.rows.map(function (r, i) {
          var p = opts.filter(function (x) { return String(x.v) === String(st.picked[i]); })[0], a = opts.filter(function (x) { return String(x.v) === String(r.answer); })[0];
          return { q: r.label || stripTags(r.html), a: p ? stripTags(p.t) : '', ans: a ? stripTags(a.t) : '', ok: p ? String(st.picked[i]) === String(r.answer) : null };
        }) };
      }
    });
  };

  /* ---- 英文關鍵詞填充 ---- */
  F1.fill = function (el, o) {    // o: {key,label,zh, parts:['text', {ans:'sense', alt:[]}, ...], bank:[...]}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { val: {}, first: null, tries: 0 });
    var blanks = o.parts.filter(function (p) { return typeof p !== 'string'; });
    var bank = shuffle(o.bank, o.key);
    var box = document.createElement('div'); box.className = 'fill';
    box.innerHTML = '<span class="zh">' + o.zh + '</span>';
    var bi = 0, btns = [];
    o.parts.forEach(function (p) {
      if (typeof p === 'string') { box.appendChild(document.createTextNode(p)); return; }
      var i = bi++, b = document.createElement('button'); b.type = 'button'; b.className = 'blank';
      b.onclick = function () { sheet('選擇第 ' + (i + 1) + ' 格的英文字', bank.map(function (w) { return { v: w, t: w }; }), st.val[i]).then(function (v) { if (v === undefined) return; st.val[i] = v; paint(); save(); }); };
      btns.push(b); box.appendChild(b);
    });
    function paint() { btns.forEach(function (b, i) { b.textContent = st.val[i] || '（' + (i + 1) + '）'; b.classList.toggle('empty', !st.val[i]); b.classList.remove('is-right', 'is-wrong'); }); }
    el.appendChild(box);
    var wb = document.createElement('div'); wb.className = 'wordbank'; wb.innerHTML = '字詞庫：' + bank.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(''); el.appendChild(wb);
    var row = document.createElement('div'); row.className = 'btnrow'; row.innerHTML = '<button type="button" class="btn primary">檢查答案</button>'; el.appendChild(row);
    var res = document.createElement('div'); res.className = 'res'; el.appendChild(res);
    function ok(i) { var b = blanks[i], v = (st.val[i] || '').toLowerCase(); return v === b.ans.toLowerCase() || (b.alt || []).map(function (x) { return x.toLowerCase(); }).indexOf(v) >= 0; }
    function check(silent) {
      var c = 0, blank = 0;
      btns.forEach(function (b, i) { if (!st.val[i]) { blank++; return; } var k = ok(i); if (k) c++; b.classList.add(k ? 'is-right' : 'is-wrong'); });
      if (blank) { res.className = 'res'; res.textContent = '還有 ' + blank + ' 格未填。'; return; }
      if (st.first === null && !silent) st.first = c;
      res.className = 'res' + (c === blanks.length ? ' good' : '');
      res.innerHTML = '成績（以第一次檢查計）：' + st.first + ' / ' + blanks.length + '　今次答對 ' + c + ' / ' + blanks.length +
        (c === blanks.length ? '<br><span style="font-weight:500">' + esc(o.parts.map(function (p, j) { return typeof p === 'string' ? p : p.ans; }).join('')) + '</span>' : '　紅色的格再想想，可以改了再檢查。');
      if (!silent) save();
    }
    paint();
    $('.btn', row).onclick = function () { check(false); };
    if (st.first !== null) check(true);
    return reg({ key: o.key, label: o.label, max: o.max || blanks.length, sec: o.sec,
      score: function () { return o.max ? (st.first || 0) / blanks.length * o.max : (st.first || 0); }, done: function () { return st.first !== null; },
      report: function () { return { type: 'fill', first: st.first, rows: blanks.map(function (b, i) { return { q: '第 ' + (i + 1) + ' 格', a: st.val[i] || '', ans: b.ans, ok: st.val[i] ? ok(i) : null }; }) }; } });
  };

  /* ---- 文字題 ---- */
  F1.text = function (el, o) {   // o: {key,label,max,min,placeholder}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { v: '' });
    el.innerHTML = '<textarea class="ta" placeholder="' + esc(o.placeholder || '寫下你的想法…') + '"></textarea><div class="counter"></div>';
    var ta = $('textarea', el), cn = $('.counter', el);
    ta.value = st.v || '';
    function count() { var n = (ta.value || '').replace(/\s/g, '').length; cn.textContent = n + ' 字' + (o.min ? (n >= o.min ? ' ✓' : '（最少 ' + o.min + ' 字）') : ''); cn.classList.toggle('ok', !o.min || n >= o.min); return n; }
    var t = 0; ta.oninput = function () { st.v = ta.value; count(); clearTimeout(t); t = setTimeout(function () { save(); }, 600); };
    count();
    return reg({ key: o.key, label: o.label, max: o.max || 0, sec: o.sec,
      score: function () { var n = (st.v || '').replace(/\s/g, '').length; return n >= (o.min || 1) ? o.max : 0; },
      done: function () { return (st.v || '').replace(/\s/g, '').length >= (o.min || 1); },
      report: function () { return { type: 'text', q: o.label, a: st.v || '' }; } });
  };

  /* ---- 檢查表 ---- */
  F1.checklist = function (el, o) {   // o: {key,label,items,max}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { c: [] });
    var ul = document.createElement('ul'); ul.className = 'checks';
    o.items.forEach(function (t, i) {
      var li = document.createElement('li'), id = o.key + '_' + i;
      li.innerHTML = '<input type="checkbox" id="' + id + '"' + (st.c[i] ? ' checked' : '') + '><label for="' + id + '">' + t + '</label>';
      $('input', li).onchange = function (e) { st.c[i] = e.target.checked; save(); };
      ul.appendChild(li);
    });
    el.appendChild(ul);
    return reg({ key: o.key, label: o.label, max: o.max || 0, sec: o.sec,
      score: function () { var n = st.c.filter(Boolean).length; return o.max ? n / o.items.length * o.max : 0; },
      done: function () { return st.c.filter(Boolean).length === o.items.length; },
      report: function () { return { type: 'checks', rows: o.items.map(function (t, i) { return { q: stripTags(t), ok: !!st.c[i] }; }) }; } });
  };

  /* ---- 預測（不計分；答了才顯示後面的內容） ---- */
  F1.predict = function (el, o) {   // o: {key,label,question,options:[{v,t}],reveal:'#selector', reasonPlaceholder}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { v: null, why: '' });
    el.innerHTML = '<div class="callout key"><span class="ttl">先預測：' + o.question + '</span><div class="opts" style="margin-top:8px">' +
      o.options.map(function (op) { return '<button type="button" class="opt" data-v="' + esc(op.v) + '">' + op.t + '</button>'; }).join('') +
      '</div><textarea class="ta" style="margin-top:8px;min-height:60px" placeholder="' + esc(o.reasonPlaceholder || '為什麼？（可以不寫）') + '"></textarea><div class="small muted pd"></div></div>';
    var ta = $('textarea', el); ta.value = st.why || '';
    ta.oninput = function () { st.why = ta.value; save(true); };
    function paint() {
      $$('.opt', el).forEach(function (b) { b.classList.toggle('is-answer', b.getAttribute('data-v') === st.v); });
      var rv = o.reveal && $(o.reveal); if (rv) rv.hidden = !st.v;
      $('.pd', el).textContent = st.v ? '已記錄你的預測。下面試試看！' : '選了預測之後，才會出現下一步。';
    }
    $$('.opt', el).forEach(function (b) { b.onclick = function () { st.v = b.getAttribute('data-v'); paint(); save(); }; });
    paint();
    return reg({ key: o.key, label: o.label, max: 0, sec: o.sec, score: function () { return 0; }, done: function () { return !!st.v; },
      report: function () { var p = o.options.filter(function (x) { return x.v === st.v; })[0]; return { type: 'text', q: o.label, a: (p ? stripTags(p.t) : '（未預測）') + (st.why ? '｜原因：' + st.why : '') }; } });
  };

  /* ---- 試驗記錄表 ---- */
  F1.trials = function (el, o) {   // o: {key,label,max,cols:[{k,label,type,options,ph,w}], example:[...cells], next(row)->html, complete(row)->bool, minRows}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { rows: [] });
    if (!st.rows.length) st.rows = [{}, {}, {}];
    var tw = document.createElement('div'); tw.className = 'tbl-wrap';
    tw.innerHTML = '<table class="trials"><thead><tr><th class="c" style="width:3em">次數</th>' + o.cols.map(function (c) { return '<th' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + c.label + '</th>'; }).join('') + '<th style="width:11em">下次試（自動）</th><th class="c" style="width:3.5em">刪除</th></tr></thead><tbody></tbody></table>';
    var tb = $('tbody', tw);
    if (o.example) { var eg = document.createElement('tr'); eg.className = 'eg'; eg.innerHTML = '<td class="c"><b>例</b></td>' + o.example.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '<td></td>'; tb.appendChild(eg); }
    function build() {
      $$('tr.r', tb).forEach(function (r) { r.remove(); });
      st.rows.forEach(function (row, i) {
        var tr = document.createElement('tr'); tr.className = 'r';
        tr.innerHTML = '<td class="c">' + (i + 1) + '</td>' + o.cols.map(function (c) {
          if (c.type === 'select') return '<td><button type="button" class="pick" data-k="' + c.k + '"></button></td>';
          return '<td><input class="inp" data-k="' + c.k + '" ' + (c.type === 'number' ? 'type="number" inputmode="decimal"' : 'type="text"') + ' placeholder="' + esc(i === 0 ? (c.ph || '') : '') + '"></td>';
        }).join('') + '<td class="next"></td><td class="c"><button type="button" class="del" title="刪除此行" aria-label="刪除此行">✕</button></td>';
        o.cols.forEach(function (c) {
          if (c.type === 'select') {
            var b = $('.pick[data-k="' + c.k + '"]', tr);
            var paint = function () { var op = c.options.filter(function (x) { return x.v === row[c.k]; })[0]; b.innerHTML = op ? op.t : '— 選擇 —'; b.classList.toggle('empty', !op); };
            b.onclick = function () { sheet(c.label, c.options, row[c.k]).then(function (v) { if (v === undefined) return; row[c.k] = v; paint(); upd(); }); };
            paint();
          } else {
            var inp = $('input[data-k="' + c.k + '"]', tr); inp.value = row[c.k] == null ? '' : row[c.k];
            inp.oninput = function () { row[c.k] = inp.value; upd(true); };
          }
        });
        function upd(quiet) { $('.next', tr).innerHTML = o.next(row) || '—'; save(quiet); }
        $('.next', tr).innerHTML = o.next(row) || '—';
        $('.del', tr).onclick = function () { if (st.rows.length <= 1) { toast('至少保留一行'); return; } st.rows.splice(i, 1); build(); save(true); };
        tb.appendChild(tr);
      });
    }
    build();
    el.appendChild(tw);
    var row = document.createElement('div'); row.className = 'btnrow';
    row.innerHTML = '<button type="button" class="btn go">＋ 新增一行</button>';
    $('.btn', row).onclick = function () { var nr = {}; if (o.carry) { for (var j = st.rows.length - 1; j >= 0; j--) { o.carry(st.rows[j], nr); if (Object.keys(nr).length) break; } } st.rows.push(nr); build(); save(true); };
    el.appendChild(row);
    var res = document.createElement('div'); res.className = 'res'; el.appendChild(res);
    function filled() { return st.rows.filter(o.complete).length; }
    var need = o.minRows || 2;
    return reg({ key: o.key, label: o.label, max: o.max, sec: o.sec,
      score: function () { var n = filled(); return n >= need ? o.max : n ? o.max / 2 : 0; },
      done: function () { return filled() >= need; },
      report: function () { return { type: 'trials', head: o.cols.map(function (c) { return stripTags(c.label); }).concat(['下次試']), rows: st.rows.filter(function (r) { return Object.keys(r).length; }).map(function (r) { return o.cols.map(function (c) { var op = c.options && c.options.filter(function (x) { return x.v === r[c.k]; })[0]; return op ? stripTags(op.t) : (r[c.k] || ''); }).concat([stripTags(o.next(r) || '')]); }) }; },
      refresh: function () { var n = filled(); res.className = 'res' + (n >= need ? ' good' : ''); res.textContent = '已完整記錄 ' + n + ' 次試驗' + (n >= need ? '（已達要求）' : '（需要 ' + need + ' 次）'); } });
  };

  /* ---- 模擬器任務 ---- */
  var SIM_ICON = '<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="3" y="3" width="38" height="38" rx="10" fill="var(--t)"/><rect x="12" y="11" width="20" height="22" rx="6" fill="#fff"/><rect x="8.5" y="17" width="4" height="10" rx="1.5" fill="#cfe0f5"/><rect x="31.5" y="17" width="4" height="10" rx="1.5" fill="#cfe0f5"/><circle cx="18" cy="18" r="2.4" fill="#ff5a4f"/><circle cx="26" cy="18" r="2.4" fill="#ff5a4f"/><rect x="17" y="24" width="10" height="2.4" rx="1.2" fill="#1b2836"/></svg>';
  F1.sim = function (el, o) {   // o: {key,mission,title,goal,max,only}
    el = typeof el === 'string' ? $(el) : el;
    el.className = 'simcard';
    el.innerHTML = '<div class="hd">' + SIM_ICON + '<div><b>模擬器任務：' + o.title + '</b><div class="goal">' + (o.goal || '') + '</div></div><span class="st">未完成</span></div>' +
      '<div class="stats"></div><div class="attempts"></div>' +
      '<div class="btnrow"><button type="button" class="btn primary open">▶ 在這裏開啟模擬器</button><a class="btn ghost newtab" target="_blank" rel="noopener">在新分頁開啟 ↗</a></div><div class="frame"></div>';
    function url() { return '../sim/index.html?m=' + o.mission + '&embed=1&only=' + encodeURIComponent(o.only || o.mission) + '&seed=' + encodeURIComponent(seedOf()); }
    function seedOf() { return STU && STU.cls ? (STU.cls + '-' + STU.num) : 'guest'; }
    $('.newtab', el).href = url().replace('&embed=1', '');
    $('.open', el).onclick = function () {
      var fr = $('.frame', el);
      if (fr.firstChild) { fr.innerHTML = ''; this.textContent = '▶ 在這裏開啟模擬器'; return; }
      fr.innerHTML = '<iframe title="麥昆小車模擬器" loading="lazy"></iframe>'; $('iframe', fr).src = url();
      this.textContent = '■ 收起模擬器';
    };
    function res() { return get('f1sim:res:' + o.mission); }
    function paint() {
      var r = res(), s = $('.st', el);
      var pass = !!(r && r.pass);
      s.textContent = pass ? '✔ 已過關' : (r && r.attempts && r.attempts.length ? '未過關（試了 ' + r.attempts.length + ' 次）' : '未完成');
      s.className = 'st' + (pass ? ' pass' : '');
      var b = r && r.best && r.best.stats, last = r && r.attempts && r.attempts[r.attempts.length - 1];
      $('.stats', el).innerHTML = b ? '最佳結果：' + statText(b) : '';
      $('.attempts', el).textContent = last ? '最近一次：' + last.title + '（' + fmtTime(last.t) + '）' : '';
    }
    paint();
    window.addEventListener('message', function (e) { if (e.data && e.data.source === 'f1sim' && e.data.mission === o.mission) { paint(); save(true); if (e.data.result.pass) toast('模擬器任務過關 ✓'); } });
    window.addEventListener('storage', function (e) { if (e.key === 'f1sim:res:' + o.mission) { paint(); refresh(); } });
    return reg({ key: o.key, label: o.label || ('模擬器：' + o.title), max: o.max || 0, sec: o.sec,
      score: function () { var r = res(); return r && r.pass ? o.max : 0; },
      done: function () { var r = res(); return !!(r && r.pass); },
      report: function () { var r = res() || {}; return { type: 'sim', mission: o.mission, pass: !!r.pass, best: r.best ? statText(r.best.stats) : '', attempts: (r.attempts || []).length, code: r.ts || '' }; } });
  };
  function statText(s) {
    var p = [];
    if (s.distance != null) p.push('前進 ' + s.distance + ' cm');
    if (s.angle != null) p.push('轉了 ' + s.angle + '°');
    if (s.closure != null) p.push('離起點 ' + s.closure + ' cm，車頭偏差 ' + s.heading + '°');
    if (s.lap != null) p.push('圈速 ' + s.lap + ' 秒');
    if (s.sharp != null) p.push('急轉 ' + s.sharp + ' 次');
    if (s.maxSpeed != null) p.push('最高速度 ' + s.maxSpeed);
    return p.join('，');
  }
  F1.statText = statText;

  /* ---- 老師驗收（真車） ---- */
  F1.verify = function (el, o) {   // o: {key,label,what,max}
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { t: 0 });
    function paint() {
      el.className = 'verify' + (st.t ? ' ok' : '');
      el.innerHTML = '<div class="vt"><b>' + (st.t ? '✔ 老師已驗收' : '請老師驗收：' + o.what) + '</b><span class="small muted">' + (st.t ? fmtTime(st.t) : '真車完成後，舉手請老師在這部電腦輸入密碼。') + '</span></div>' +
        (st.t ? '' : '<button type="button" class="btn">老師驗收</button>');
      var b = $('button', el);
      if (b) b.onclick = function () { askPin('老師驗收：' + o.what).then(function (ok) { if (ok) { st.t = Date.now(); paint(); save(); toast('老師已驗收 ✓'); } }); };
    }
    paint();
    return reg({ key: o.key, label: o.label, max: o.max, sec: o.sec, score: function () { return st.t ? o.max : 0; }, done: function () { return !!st.t; },
      report: function () { return { type: 'verify', q: o.what, ok: !!st.t, t: st.t ? fmtTime(st.t) : '' }; } });
  };

  /* ---- MakeCode 分享連結 ---- */
  F1.mclink = function (el, o) {
    el = typeof el === 'string' ? $(el) : el;
    var st = F1.state(o.key, { v: '' });
    el.innerHTML = '<label class="fld">MakeCode 專案分享連結（在 MakeCode 按「分享」→「複製」）</label><input class="inp" type="url" placeholder="https://makecode.com/_xxxxxxxxxxxx"><div class="small" style="margin-top:4px"></div>';
    var inp = $('input', el), msg = $('.small', el);
    function okv(v) { return /^https:\/\/(makecode\.com\/_[A-Za-z0-9]{6,}|makecode\.microbit\.org\/(_[A-Za-z0-9]{6,}|#pub:_?[A-Za-z0-9]{6,}|S\d{5}-\d{5}-\d{5}-\d{5}))\s*$/.test(v); }
    function paint() { var v = (inp.value || '').trim(); msg.textContent = !v ? '' : okv(v) ? '✔ 連結格式正確' : '連結格式不像 MakeCode 分享連結，請再檢查（應以 https://makecode.com/_ 開頭）。'; msg.style.color = okv(v) ? 'var(--ok)' : 'var(--no)'; }
    inp.value = st.v || ''; paint();
    inp.oninput = function () { st.v = inp.value.trim(); paint(); save(true); };
    return reg({ key: o.key, label: o.label || 'MakeCode 分享連結', max: 0, sec: o.sec, score: function () { return 0; }, done: function () { return okv(st.v || ''); },
      report: function () { return { type: 'link', q: 'MakeCode 分享連結', a: st.v || '', ok: okv(st.v || '') }; } });
  };

  /* ---- 影片（Google Drive／YouTube／本機檔案；播不到時可由電腦選檔） ---- */
  F1.video = function (el, o) {   // o: {type:'gdrive'|'youtube'|'file'|'none', id, src, title}
    el = typeof el === 'string' ? $(el) : el;
    var pick = '<details class="more"><summary>影片播不到？</summary><div><p class="small">① 確認已連上互聯網；② 按上面連結在新分頁開啟；③ 學校網絡封鎖時，可用老師派發的影片檔：</p><label class="btn sm">📂 由電腦選擇影片檔<input type="file" accept="video/*" hidden></label></div></details>';
    var frame = '';
    if (o.type === 'gdrive' && o.id) frame = '<div style="position:relative;padding-bottom:56.25%;border-radius:12px;overflow:hidden;background:#000"><iframe src="https://drive.google.com/file/d/' + esc(o.id) + '/preview" title="' + esc(o.title) + '" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0" loading="lazy"></iframe></div><p class="small muted">🎬 ' + esc(o.title) + '　<a href="https://drive.google.com/file/d/' + esc(o.id) + '/view" target="_blank" rel="noopener">在新分頁開啟</a></p>';
    else if (o.type === 'youtube' && o.id) frame = '<div style="position:relative;padding-bottom:56.25%;border-radius:12px;overflow:hidden;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(o.id) + '" title="' + esc(o.title) + '" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0" loading="lazy"></iframe></div>';
    else if (o.type === 'file' && o.src) frame = '<video controls playsinline preload="metadata" src="' + esc(o.src) + '" style="width:100%;border-radius:12px;background:#000"></video>';
    else frame = '<div class="ph-box">🎬 ' + esc(o.title || '示範影片') + '<br><span class="small">老師尚未加入這段影片。</span></div>';
    el.innerHTML = frame + pick;
    var inp = $('input[type=file]', el);
    if (inp) inp.onchange = function () { var f = inp.files[0]; if (!f) return; el.innerHTML = '<video controls playsinline src="' + URL.createObjectURL(f) + '" style="width:100%;border-radius:12px;background:#000"></video><p class="small muted">已載入：' + esc(f.name) + '</p>'; };
  };

  /* ---- 自訂元件（例如計算器） ---- */
  F1.custom = function (o) { return reg(o); };

  /* =====================================================================
     頁面結構：頂部列、目錄、小節、導航
     ===================================================================== */
  var MASCOT = '<svg class="mascot" viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="10" width="26" height="22" rx="8" fill="var(--t)"/><rect x="3" y="16" width="5" height="12" rx="2" fill="#9fb3c8"/><rect x="32" y="16" width="5" height="12" rx="2" fill="#9fb3c8"/><circle cx="15" cy="20" r="3.2" fill="#fff"/><circle cx="25" cy="20" r="3.2" fill="#fff"/><circle cx="15" cy="20" r="1.5" fill="#1b2836"/><circle cx="25" cy="20" r="1.5" fill="#1b2836"/><rect x="15" y="26" width="10" height="2.4" rx="1.2" fill="#fff"/><line x1="20" y1="10" x2="20" y2="5" stroke="var(--t)" stroke-width="2"/><circle cx="20" cy="4.5" r="2.4" fill="#ffd166"/></svg>';
  F1.MASCOT = MASCOT;

  function buildTop() {
    var tb = document.createElement('div'); tb.className = 'topbar';
    tb.innerHTML = '<div class="in">' +
      '<div class="crumb">' + MASCOT + '<span class="here">' + esc(L.short) + '</span></div>' +
      '<div class="prog" title="完成進度"><span class="bar"><i></i></span><span class="pct">0%</span></div>' +
      '<span class="pill" title="目前分數">0 / 0</span>' +
      '<span class="who"></span>' +
      '<a class="tbtn" href="#submit" title="成績及交功課" aria-label="成績及交功課">📥<span class="lbl">交功課</span></a>' +
      '</div>';
    document.body.prepend(tb);
  }
  function buildSections() {
    var secs = $$('main > section.card');
    secs.forEach(function (s, i) {
      var hd = $('header', s);
      var tools = document.createElement('div'); tools.className = 'sec-tools';
      tools.innerHTML = '<button type="button" class="cl" title="摺起／展開">摺起</button>';
      hd.appendChild(tools);
      $('.cl', tools).onclick = function () { s.classList.toggle('collapsed'); this.textContent = s.classList.contains('collapsed') ? '展開' : '摺起'; };
      var next = secs[i + 1];
      if (next && !s.hasAttribute('data-nonext')) {
        var nx = document.createElement('div'); nx.className = 'next-sec';
        nx.innerHTML = '<a href="#' + next.id + '">下一節：' + esc(next.getAttribute('data-short') || $('header h2', next).textContent) + ' ↓</a>';
        s.appendChild(nx);
      }
    });
  }

  /* ---------- 放大圖、表格捲動提示、圖片 ---------- */
  function enhance() {
    $$('figure.zoomable .art').forEach(function (a) {
      a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button'); a.setAttribute('aria-label', '放大圖片');
      a.onclick = function () {
        var lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = '<div class="lb-in"></div>';
        $('.lb-in', lb).appendChild(a.cloneNode(true).firstElementChild || a.cloneNode(true));
        lb.onclick = function () { lb.remove(); }; document.body.appendChild(lb);
      };
      a.onkeydown = function (e) { if (e.key === 'Enter') a.onclick(); };
    });
    function hints() { $$('.tbl-wrap').forEach(function (w) { w.classList.toggle('has-overflow', w.scrollWidth > w.clientWidth + 4); }); }
    hints(); window.addEventListener('resize', hints);
    // 找不到圖片：學生看不到佔位框，老師模式才看到
    $$('img[data-ph]').forEach(function (im) {
      function fail() {
        var fig = im.closest('figure');
        var ph = document.createElement('div'); ph.className = 'ph-box teacher-only'; ph.innerHTML = '圖片未找到：<code>' + esc(im.getAttribute('src')) + '</code><br>' + esc(im.getAttribute('data-ph'));
        im.replaceWith(ph);
        if (fig && !document.body.classList.contains('teacher')) fig.classList.add('teacher-only');
      }
      if (im.complete && !im.naturalWidth) fail(); else im.addEventListener('error', fail);
    });
  }

  /* =====================================================================
     學生資料、成績、報告
     ===================================================================== */
  function stuOK() { return STU && STU.cls && STU.num && STU.name; }
  function bindStudent() {
    var box = $('#student'); if (!box) return;
    box.innerHTML = '<div class="idgrid">' +
      '<div><label class="fld" for="f_cls">班別</label><input class="inp" id="f_cls" placeholder="例：1A" autocomplete="off"></div>' +
      '<div><label class="fld" for="f_num">學號</label><input class="inp" id="f_num" placeholder="例：12" inputmode="numeric" autocomplete="off"></div>' +
      '<div><label class="fld" for="f_name">姓名</label><input class="inp" id="f_name" placeholder="例：陳大文" autocomplete="off"></div></div>' +
      (L.pair ? '<div class="pairbox"><b>組員二</b><span class="small muted">（兩人一組才填；一人一組請留空。報告會同時記錄兩位同學）</span>' +
        '<div class="idgrid"><div><label class="fld" for="f_pnum">組員二 學號</label><input class="inp" id="f_pnum" placeholder="例：5" inputmode="numeric" autocomplete="off"></div>' +
        '<div><label class="fld" for="f_pname">組員二 姓名</label><input class="inp" id="f_pname" placeholder="例：李小明" autocomplete="off"></div></div></div>' : '') +
      '<p class="small muted stmsg"></p>';
    [['f_cls', 'cls'], ['f_num', 'num'], ['f_name', 'name']].forEach(function (x) {
      var el = $('#' + x[0]); el.value = STU[x[1]] || '';
      el.oninput = function () { var v = el.value.trim(); STU[x[1]] = x[1] === 'cls' ? v.toUpperCase() : v; put('f1dt:student', STU); refresh(); };
    });
    if (L.pair) [['f_pnum', 'num'], ['f_pname', 'name']].forEach(function (x) {
      var el = $('#' + x[0]); D.partner = D.partner || {}; el.value = D.partner[x[1]] || '';
      el.oninput = function () { D.partner[x[1]] = el.value.trim(); put(L.key, D); refresh(); };
    });
  }
  function partner() { var p = D && D.partner; return L && L.pair && p && p.name ? p : null; }
  F1.partner = partner;
  function refresh() {
    var t = totals();
    var pill = $('.topbar .pill'); if (pill) pill.textContent = t.score + ' / ' + t.max + ' 分';
    var bar = $('.topbar .bar i'); if (bar) bar.style.width = t.prog + '%';
    var pct = $('.topbar .pct'); if (pct) pct.textContent = t.prog + '%';
    var who = $('.topbar .who'); if (who) who.textContent = stuOK() ? STU.cls + ' ' + STU.num + ' ' + STU.name + (partner() ? '＋' + partner().name : '') : '未填姓名';
    var m = $('.stmsg'); if (m) m.textContent = stuOK() ? '✔ 資料已填妥。（四課共用；換同學用這部電腦時，系統會先問你是誰）' : '⚠️ 請先填寫班別、學號及姓名，否則不能輸出功課。';
    F1.comps.forEach(function (c) { if (c.refresh) c.refresh(); });
    // 小節完成
    $$('main > section.card').forEach(function (s) {
      var keys = F1.comps.filter(function (c) { return c.sec === s.id; });
      var done = keys.length && keys.every(function (c) { return c.done(); });
      var was = s.classList.contains('done');
      s.classList.toggle('done', !!done);
      if (done && !was && booted) {
        D.badges = D.badges || {};
        if (!D.badges[s.id]) { D.badges[s.id] = Date.now(); put(L.key, D); toast('🏅 完成：' + (s.getAttribute('data-short') || $('header h2', s).textContent)); }
      }
    });
    renderScore();
    D.summary = { score: t.score, max: t.max, pct: t.pct, prog: t.prog }; put(L.key, D);
  }
  F1.refresh = refresh;
  function renderScore() {
    var box = $('#scoretable'); if (!box) return;
    var t = totals(), rows = F1.comps.filter(function (c) { return c.counted; });
    box.innerHTML = '<div class="tbl-wrap"><table class="scoretbl"><thead><tr><th>評分項目</th><th class="c">得分</th><th class="c">滿分</th></tr></thead><tbody>' +
      rows.map(function (c) { return '<tr><td>' + esc(c.label) + (c.done() ? '' : ' <span class="muted small">（未完成）</span>') + '</td><td>' + (Math.round(scoreOf(c) * 10) / 10) + '</td><td>' + c.max + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>總分</td><td>' + t.score + '</td><td>' + t.max + '</td></tr><tr><td>百分比及等級</td><td colspan="2" class="c">' + t.pct + '%　' + grade(t.pct) + '</td></tr></tbody></table></div>' +
      (D.badges && Object.keys(D.badges).length ? '<div class="badges">' + Object.keys(D.badges).map(function (id) { var s = document.getElementById(id); return s ? '<span class="badge">🏅 ' + esc(s.getAttribute('data-short') || $('header h2', s).textContent) + '</span>' : ''; }).join('') + '</div>' : '');
  }

  function reportData() {
    var t = totals();
    return {
      app: CFG.APP, v: CFG.VERSION, lesson: L.id, title: L.title,
      cls: STU.cls, no: STU.num, name: STU.name, partner: partner() ? { no: partner().num || '', name: partner().name } : null,
      exported: Date.now(), total: t.score, max: t.max, pct: t.pct, grade: grade(t.pct),
      items: F1.comps.map(function (c) { return { key: c.key, label: c.label, score: Math.round(scoreOf(c) * 10) / 10, max: c.max, done: c.done(), detail: c.report ? c.report() : null }; }),
      badges: Object.keys(D.badges || {}).length, teacherUsed: !!D.teacherUsed
    };
  }
  function renderReport(d, ok, sig) {   /* 這個函數會複製到報告檔內，所以不可用外面的變數 */
    function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function dt(t) { var x = new Date(t), p = function (n) { return (n < 10 ? '0' : '') + n; }; return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()) + ' ' + p(x.getHours()) + ':' + p(x.getMinutes()); }
    var code = sig ? (sig.slice(0, 4) + '-' + sig.slice(4, 8) + '-' + sig.slice(8, 12)).toUpperCase() : '';
    var h = '<div class="rhead"><div><div class="rk">中一設計與科技｜自動化與機械人</div><h1>' + e(d.title) + '　學習報告</h1></div>' +
      '<div class="rv ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✔ 驗證碼正確' : '✘ 驗證失敗：報告可能被修改') + '<br><b>' + code + '</b></div></div>';
    h += '<div class="rinfo"><span>班別：<b>' + e(d.cls) + '</b></span><span>學號：<b>' + e(d.no) + '</b></span><span>姓名：<b>' + e(d.name) + '</b></span>' + (d.partner && d.partner.name ? '<span>組員二：<b>' + e(d.partner.no) + ' ' + e(d.partner.name) + '</b></span>' : '') + '<span>輸出時間：' + dt(d.exported) + '</span></div>';
    h += '<div class="rscore"><div class="big">' + d.total + ' <small>/ ' + d.max + '</small></div><div>' + d.pct + '%　' + e(d.grade) + (d.teacherUsed ? '<br><small>（曾使用老師模式）</small>' : '') + '</div></div>';
    h += '<table><tr><th>評分項目</th><th>得分</th><th>滿分</th></tr>';
    d.items.forEach(function (it) { if (it.max > 0) h += '<tr><td>' + e(it.label) + (it.done ? '' : '（未完成）') + '</td><td>' + it.score + '</td><td>' + it.max + '</td></tr>'; });
    h += '</table>';
    d.items.forEach(function (it) {
      var x = it.detail; if (!x) return;
      h += '<h2>' + e(it.label) + (it.max > 0 ? '　<small>' + it.score + ' / ' + it.max + '</small>' : '') + '</h2>';
      if (x.type === 'choice' || x.type === 'match' || x.type === 'fill') {
        h += '<table><tr><th>題目</th><th>學生答案（第一次）</th><th>正確答案</th><th></th></tr>';
        x.rows.forEach(function (r) { h += '<tr><td>' + e(r.q) + '</td><td>' + e(r.a || '未作答') + '</td><td>' + e(r.ans) + '</td><td>' + (r.ok === null ? '' : r.ok ? '✔' : '✘') + '</td></tr>'; });
        h += '</table>';
      } else if (x.type === 'text') {
        h += '<div class="ans">' + (x.a ? e(x.a).replace(/\n/g, '<br>') : '（未作答）') + '</div>';
      } else if (x.type === 'checks') {
        h += '<ul>' + x.rows.map(function (r) { return '<li>' + (r.ok ? '☑' : '☐') + ' ' + e(r.q) + '</li>'; }).join('') + '</ul>';
      } else if (x.type === 'trials') {
        h += '<table><tr><th>#</th>' + x.head.map(function (c) { return '<th>' + e(c) + '</th>'; }).join('') + '</tr>' +
          x.rows.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td>' + r.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
      } else if (x.type === 'sim') {
        h += '<p>' + (x.pass ? '✔ 已過關' : '未過關') + '（試了 ' + x.attempts + ' 次）' + (x.best ? '｜最佳：' + e(x.best) : '') + '</p>' + (x.code ? '<details><summary>學生程式（MakeCode JavaScript）</summary><pre>' + e(x.code) + '</pre></details>' : '');
      } else if (x.type === 'verify') {
        h += '<p>' + (x.ok ? '✔ 老師已驗收（' + e(x.t) + '）' : '未驗收') + '：' + e(x.q) + '</p>';
      } else if (x.type === 'link') {
        h += '<p>' + (x.a ? '<a href="' + e(x.a) + '">' + e(x.a) + '</a>' + (x.ok ? '' : '（格式可能不正確）') : '（未提供）') + '</p>';
      } else if (x.type === 'kv') {
        h += '<table>' + x.rows.map(function (r) { return '<tr><th style="width:40%">' + e(r[0]) + '</th><td>' + e(r[1]) + '</td></tr>'; }).join('') + '</table>';
      }
    });
    h += '<div class="rfoot">學生簽署：__________________　　老師簽署：__________________<br>驗證碼由學習網站自動產生；老師可以用「成績匯總工具」一次核對全班報告。</div>';
    return h;
  }
  var REPORT_CSS = 'body{margin:0;background:#eef2f6;padding:24px 12px;font-family:"Noto Sans TC","PingFang HK","Microsoft JhengHei",sans-serif;color:#1b2836;line-height:1.6}' +
    '.rep{max-width:860px;margin:auto;background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 4px 20px rgba(0,0,0,.06)}' +
    '.rhead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:3px solid #1d63c9;padding-bottom:12px}' +
    '.rk{font-size:13px;color:#5f6f82;letter-spacing:.08em}h1{font-size:22px;margin:4px 0 0}h2{font-size:16px;margin:22px 0 8px;color:#144a99}h2 small{color:#5f6f82;font-weight:500}' +
    '.rv{border-radius:10px;padding:8px 12px;font-size:13px;text-align:right;white-space:nowrap}.rv.ok{background:#e6f5ec;color:#0f5e32}.rv.bad{background:#fdeeec;color:#8a2316}.rv b{font-family:Consolas,monospace;font-size:16px;letter-spacing:.06em}' +
    '.rinfo{display:flex;flex-wrap:wrap;gap:8px 20px;margin:12px 0;font-size:14px}.rscore{display:flex;align-items:center;gap:18px;background:#f2f6fb;border-radius:12px;padding:10px 16px;margin:10px 0}' +
    '.big{font-size:34px;font-weight:900;color:#144a99}.big small{font-size:16px;color:#5f6f82}' +
    'table{width:100%;border-collapse:collapse;font-size:13.5px;margin:6px 0}th,td{border:1px solid #d7e0ea;padding:6px 9px;text-align:left;vertical-align:top}th{background:#eef4fc;color:#144a99}' +
    '.ans{background:#fffdf3;border:1px solid #ebc56a;border-radius:10px;padding:8px 12px;white-space:normal}pre{background:#16222e;color:#e6edf3;border-radius:8px;padding:10px;font-size:12px;overflow:auto}' +
    '.rfoot{margin-top:26px;border-top:1px dashed #9aa9b9;padding-top:10px;font-size:13px;color:#5f6f82}@media print{body{background:#fff;padding:0}.rep{box-shadow:none}}';
  function reportHTML() {
    var d = reportData(), payload = JSON.stringify(d), sig = SHA.hmac(CFG.SIGN_KEY, payload);
    var box = JSON.stringify({ payload: payload, sig: sig }).replace(/</g, '\\u003c');
    var shaSrc = (window.__SHA_SRC || '').replace(/<\/script/gi, '<\\/script');
    return { sig: sig, d: d, html: '<!DOCTYPE html><html lang="zh-Hant-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>F1 DT ' + esc(d.lesson) + ' 學習報告 ' + esc(d.cls) + ' ' + esc(d.no) + ' ' + esc(d.name) + '</title><style>' + REPORT_CSS + '</style></head><body>' +
      '<div class="rep" id="r"><noscript>請用 Chrome 或 Edge 開啟這份報告。</noscript></div>' +
      '<script type="application/json" id="f1-report">' + box + '<\/script><script>' + shaSrc + '<\/script><script>var KEY=' + JSON.stringify(CFG.SIGN_KEY) + ';' + renderReport.toString() +
      '(function(){var b=JSON.parse(document.getElementById("f1-report").textContent),d=null,ok=false;try{d=JSON.parse(b.payload);ok=SHA.hmac(KEY,b.payload)===b.sig;}catch(e){}document.getElementById("r").innerHTML=d?renderReport(d,ok,b.sig):"<p>報告資料已損壞。</p>";})();<\/script></body></html>' };
  }
  F1.reportHTML = reportHTML;
  function download(name, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function exportReport() {
    if (!stuOK()) { dialog({ title: '未填學生資料', html: '<p>請先在本課開頭填寫班別、學號及姓名。</p>' }).then(function () { location.hash = '#student-sec'; }); return; }
    var r = reportHTML();
    var pp = partner();
    download('DT_F1_' + L.id + '_' + STU.cls + '_' + STU.num + '_' + STU.name + (pp ? '_' + (pp.num || '') + '_' + pp.name : '') + '.html', r.html);
    D.exported = Date.now(); save(true);
    dialog({ title: '已下載成績報告', html: '<p>檔案在「下載」資料夾，請上傳到 Google Classroom／eClass。</p><p>驗證碼：<b>' + (r.sig.slice(0, 4) + '-' + r.sig.slice(4, 8) + '-' + r.sig.slice(8, 12)).toUpperCase() + '</b></p><p><b>如果這是共用電腦</b>，請清除這部電腦上的資料，下一位同學才不會看到你的答案。</p>',
      buttons: [{ t: '保留資料' }, { t: '清除這部電腦的資料', kind: 'primary', f: function () { clearAll(); setTimeout(function () { location.reload(); }, 50); } }] });
  }
  function printReport() {
    if (!stuOK()) { exportReport(); return; }
    var w = window.open('', '_blank'); if (!w) { toast('請容許彈出視窗'); return; }
    w.document.write(reportHTML().html); w.document.close(); setTimeout(function () { w.print(); }, 600);
  }
  function bindSubmit() {
    var b = $('#submitBtns'); if (!b) return;
    b.innerHTML = '<button type="button" class="btn go">📥 下載成績報告（交給老師）</button><button type="button" class="btn">🖨️ 列印／存成 PDF</button><button type="button" class="btn ghost">清除這部電腦的資料</button>';
    var bs = $$('.btn', b);
    bs[0].onclick = exportReport; bs[1].onclick = printReport;
    bs[2].onclick = function () { dialog({ title: '清除資料？', html: '<p>會刪除這部電腦上本單元所有課堂的答案、模擬器程式及學生資料，不能復原。已下載的報告不受影響。</p>', buttons: [{ t: '取消' }, { t: '清除', kind: 'primary', f: function () { clearAll(); setTimeout(function () { location.reload(); }, 50); } }] }); };
  }

  /* ---------- 身份確認（共用電腦） ---------- */
  function identityCheck() {
    var last = 0;
    try { Object.keys(localStorage).forEach(function (k) { if (/^f1dt:L/.test(k)) { var x = get(k); if (x && x.lastActive > last) last = x.lastActive; } }); } catch (e) {}
    var idle = (Date.now() - last) / 60000;
    if (!stuOK() || !last || idle < (CFG.IDLE_MINUTES || 20)) return;
    dialog({ title: '你是 ' + STU.cls + ' ' + STU.num + ' ' + STU.name + ' 嗎？', html: '<p>這部電腦上已經有這位同學的答案。</p>',
      buttons: [{ t: '不是，我是另一位同學', f: function () { clearAll(); setTimeout(function () { location.reload(); }, 50); } }, { t: '是，繼續', kind: 'primary' }] });
  }

  /* ---------- 老師模式 ---------- */
  function teacherMode() {
    if (new URLSearchParams(location.search).get('teacher') !== '1') return;
    askPin('進入老師模式').then(function (ok) {
      if (!ok) return;
      document.body.classList.add('teacher'); D.teacherUsed = true; save(true);
      toast('老師模式：顯示圖片佔位框及老師提示');
      $$('figure.teacher-only').forEach(function (f) { f.classList.remove('teacher-only'); });
    });
  }

  /* =====================================================================
     啟動
     ===================================================================== */
  var booted = false;
  F1.start = function (lesson) {
    L = lesson;
    if (L.theme) document.body.setAttribute('data-theme', L.theme);
    D = get(L.key) || { v: 1, items: {}, badges: {} };
    D.items = D.items || {};
    STU = get('f1dt:student') || {};
    F1.stu = STU;
    buildTop(); buildSections(); bindStudent(); bindSubmit(); enhance();
    return F1;
  };
  F1.ready = function () {     // 課堂頁建立所有元件後呼叫
    refresh(); booted = true;
    identityCheck(); teacherMode();
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); }
  };
  F1.renderReport = renderReport;
})();
