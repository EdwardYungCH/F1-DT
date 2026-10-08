/* =====================================================================
   F1 DT 模擬器 — 任務（每課使用的場景、工具箱、起步程式及過關條件）
   ===================================================================== */
(function () {
  'use strict';
  function x(s) { return '<xml xmlns="https://developers.google.com/blockly/xml">' + s + '</xml>'; }
  function n(v) { return '<shadow type="math_number"><field name="NUM">' + v + '</field></shadow>'; }
  function motor(m, d, s, next) { return '<block type="f1_mq_motor"><field name="M">' + m + '</field><field name="D">' + d + '</field><value name="S">' + n(s) + '</value>' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  function stop(m, next) { return '<block type="f1_mq_stop"><field name="M">' + m + '</field>' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  function pause(ms, next) { return '<block type="f1_pause"><value name="MS">' + n(ms) + '</value>' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  function init(next) { return '<block type="f1_mq_init">' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  function start(body, xpos, ypos) { return '<block type="f1_on_start" x="' + (xpos || 30) + '" y="' + (ypos || 30) + '"><statement name="DO">' + body + '</statement></block>'; }
  function forever(body, xpos, ypos) { return '<block type="f1_forever" x="' + (xpos || 30) + '" y="' + (ypos || 200) + '">' + (body ? '<statement name="DO">' + body + '</statement>' : '') + '</block>'; }
  // 變數：v = [名稱, id]
  var VF = ['前進時間', 'v_fwd'], VT = ['轉彎時間', 'v_turn'];
  function vdecl(list) { return '<variables>' + list.map(function (v) { return '<variable id="' + v[1] + '">' + v[0] + '</variable>'; }).join('') + '</variables>'; }
  function vget(v) { return '<block type="variables_get"><field name="VAR" id="' + v[1] + '">' + v[0] + '</field></block>'; }
  function setv(v, val, next) { return '<block type="variables_set"><field name="VAR" id="' + v[1] + '">' + v[0] + '</field><value name="VALUE">' + n(val) + '</value>' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  function pausev(v, next) { return '<block type="f1_pause"><value name="MS">' + n(100) + vget(v) + '</value>' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  function repeat(times, body, next) { return '<block type="f1_repeat"><value name="TIMES">' + n(times) + '</value><statement name="DO">' + body + '</statement>' + (next ? '<next>' + next + '</next>' : '') + '</block>'; }
  // 完整正方形程式（變數版）
  function squareV(f, t, spd) {
    spd = spd || 50;
    return x(vdecl([VF, VT]) + start(setv(VF, f, setv(VT, t, init(pause(1000, repeat(4,
      motor('A', '1', spd, pausev(VF, stop('A', pause(500, motor('L', '1', spd, motor('R', '-1', spd, pausev(VT, stop('A', pause(500))))))))))))))));
  }
  function cond(s) { return '<block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="f1_mq_line"><field name="S">' + s + '</field></block></value><value name="B">' + n(1) + '</value></block>'; }
  // 起步版巡線程式；corr = 'stop'（一邊停）或 'back'（一邊後退）
  function follower(corr) {
    var left = corr === 'stop' ? stop('L', motor('R', '1', 20)) : motor('L', '-1', 10, motor('R', '1', 20));
    var right = corr === 'stop' ? motor('L', '1', 20, stop('R')) : motor('L', '1', 20, motor('R', '-1', 10));
    return '<block type="controls_if"><mutation elseif="2" else="1"></mutation>' +
      '<value name="IF0">' + cond(2) + '</value><statement name="DO0">' + motor('A', '1', 20) + '</statement>' +
      '<value name="IF1">' + cond(1) + '</value><statement name="DO1">' + left + '</statement>' +
      '<value name="IF2">' + cond(3) + '</value><statement name="DO2">' + right + '</statement>' +
      '<statement name="ELSE">' + stop('A') + '</statement></block>';
  }

  var MISSIONS = {
    l2sq: {
      lesson: 2, level: 1, scene: 'tiles', title: '走一格地磚正方形',
      goal: '程式開頭設定變數「前進時間」和「轉彎時間」，暫停積木用這兩個變數；速度 50，用「重複 4 次」走一格地磚（60 cm）的正方形：每邊 55–65 cm，回到起點 15 cm 內，車頭偏差 15° 內。',
      check: 'square', needVars: true,
      starter: x(vdecl([VF, VT]) + start(init(pause(1000))))
    },
    l3poe: {
      lesson: 3, level: 2, scene: 'oval', title: '比較轉彎方式：② 一邊停 對 ③ 一邊後退',
      goal: '先執行這個「一邊停」版本，觀察結果；再把修正改成「一邊後退 10、一邊前進 20」，比較一次。',
      check: 'lap', lapPass: true,
      starter: x(start(init(pause(1000))) + forever(follower('stop'), 30, 170))
    },
    l3lap: {
      lesson: 3, level: 2, scene: 'oval', title: '巡線一圈',
      goal: '用 L1、M、R1 三個感應器，令小車在 0 字巡線圖上自己走完一整圈。',
      check: 'lap',
      starter: x(start(init(pause(1000))) + forever('', 30, 170))
    },
    l4lap: {
      lesson: 4, level: 2, scene: 'oval', title: '照流程圖砌出巡線程式',
      goal: '不看截圖，跟着自己的流程圖由零砌出巡線程式，走完一整圈。',
      check: 'lap',
      starter: x(start('', 30, 30) + forever('', 30, 150))
    },
    l4tier: {
      lesson: 4, level: 2, scene: 'sharp', title: '分層修正：急彎挑戰圖',
      goal: '加入 L2、R2：輕微偏離用「一邊停」，大幅偏離才用「一邊後退」。直行速度至少 40，走完一圈而且「急轉次數」不多於 50 次。',
      check: 'tier', minSpeed: 40, maxSharp: 50,
      starter: x(start(init(pause(1000))) + forever(follower('back'), 30, 170)),
      starterNote: '起步程式是第三堂的版本（只有 L1、M、R1），請按你的流程圖修改。'
    },
    free: {
      lesson: 0, level: 2, scene: 'oval', title: '自由練習', goal: '隨意試驗。可以在右上角轉換場景。', check: 'none', free: true,
      starter: x(start(init(pause(1000))) + forever('', 30, 170))
    }
  };
  window.F1Missions = MISSIONS;
  window.F1Xml = { x: x, n: n, motor: motor, stop: stop, pause: pause, init: init, start: start, forever: forever, cond: cond, follower: follower,
    VF: VF, VT: VT, vdecl: vdecl, vget: vget, setv: setv, pausev: pausev, repeat: repeat, squareV: squareV };
})();
