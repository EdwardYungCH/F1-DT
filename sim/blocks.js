/* =====================================================================
   F1 DT 模擬器 — 積木定義（字眼照 MakeCode 繁體中文介面）
   及兩個程式碼產生器：模擬器用的 JavaScript、MakeCode 用的 TypeScript
   ===================================================================== */
(function () {
  'use strict';
  var C = { basic: '#1E90FF', loops: '#00AA00', logic: '#00A4A6', vars: '#DC143C', math: '#9400D3', mq: '#0FBC11' };
  window.F1Colors = C;

  /* ---------- 訊息（覆寫 Blockly 內置字眼，令它更似 MakeCode） ---------- */
  var M = Blockly.Msg;
  M.CONTROLS_IF_MSG_IF = '如果';
  M.CONTROLS_IF_MSG_THEN = '那麼';
  M.CONTROLS_IF_MSG_ELSEIF = '否則如果';
  M.CONTROLS_IF_MSG_ELSE = '否則';
  M.CONTROLS_IF_IF_TITLE_IF = '如果';
  M.CONTROLS_IF_ELSEIF_TITLE_ELSEIF = '否則如果';
  M.CONTROLS_IF_ELSE_TITLE_ELSE = '否則';
  M.LOGIC_OPERATION_AND = '且';
  M.LOGIC_OPERATION_OR = '或';
  M.LOGIC_NEGATE_TITLE = '非 %1';
  M.VARIABLES_SET = '變數 %1 設為 %2';
  M.MATH_CHANGE_TITLE = '變數 %1 改變 %2';
  M.NEW_VARIABLE = '建立變數…';
  M.NEW_VARIABLE_TITLE = '新變數的名稱：';
  M.DELETE_BLOCK = '刪除積木';
  M.DELETE_X_BLOCKS = '刪除 %1 個積木';
  M.DUPLICATE_BLOCK = '複製';
  M.CLEAN_UP = '整理積木';
  M.UNDO = '復原'; M.REDO = '重做';
  ['CONTROLS_IF_HUE', 'LOGIC_HUE'].forEach(function (k) { M[k] = C.logic; });
  M.LOOPS_HUE = C.loops; M.MATH_HUE = C.math; M.VARIABLES_HUE = C.vars;

  function dd(arr) { return arr.map(function (a) { return [a[0], a[1]]; }); }
  var MOTOR = dd([['全部馬達', 'A'], ['左側馬達', 'L'], ['右側馬達', 'R']]);
  var DIR = dd([['前進', '1'], ['後退', '-1']]);
  var LINE = dd([['M', '2'], ['L1', '1'], ['R1', '3'], ['L2', '0'], ['R2', '4']]);
  var LED = dd([['全部LED燈', 'A'], ['左側LED燈', 'L'], ['右側LED燈', 'R']]);
  var SW = dd([['開啟', '1'], ['關閉', '0']]);

  Blockly.defineBlocksWithJsonArray([
    { type: 'f1_on_start', message0: '當啟動時', message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: C.basic, tooltip: '開機（或按 reset）後執行一次', hat: 'none' },
    { type: 'f1_forever', message0: '重複無限次', message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: C.basic, tooltip: '裏面的積木會不停重複（每次之間約 20 毫秒）' },
    { type: 'f1_pause', message0: '暫停 (ms) %1', args0: [{ type: 'input_value', name: 'MS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.basic, tooltip: '等待多少毫秒（1000 毫秒 = 1 秒）；馬達會保持上一個動作', inputsInline: true },
    { type: 'f1_show_number', message0: '顯示 數字 %1', args0: [{ type: 'input_value', name: 'N', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.basic, inputsInline: true },
    { type: 'f1_repeat', message0: '重複 %1 次', args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }], message1: '執行 %1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: C.loops, inputsInline: true },
    { type: 'f1_mq_init', message0: '初始化麥昆Plus', previousStatement: null, nextStatement: null, colour: C.mq, tooltip: '程式開頭必須加，令 micro:bit 與小車連接' },
    { type: 'f1_mq_motor', message0: '設置 %1 方向 %2 速度 %3', args0: [{ type: 'field_dropdown', name: 'M', options: MOTOR }, { type: 'field_dropdown', name: 'D', options: DIR }, { type: 'input_value', name: 'S', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.mq, inputsInline: true, tooltip: '速度 0–255。馬達不會自己停！' },
    { type: 'f1_mq_stop', message0: '設置 %1 停止', args0: [{ type: 'field_dropdown', name: 'M', options: MOTOR }], previousStatement: null, nextStatement: null, colour: C.mq },
    { type: 'f1_mq_line', message0: '讀取循跡感測器 %1 狀態', args0: [{ type: 'field_dropdown', name: 'S', options: LINE }], output: 'Number', colour: C.mq, tooltip: '黑線 = 1，白色 = 0' },
    { type: 'f1_mq_led', message0: '控制 %1 %2', args0: [{ type: 'field_dropdown', name: 'L', options: LED }, { type: 'field_dropdown', name: 'V', options: SW }], previousStatement: null, nextStatement: null, colour: C.mq }
  ]);
  // 內置積木改顏色
  ['controls_if', 'logic_compare', 'logic_operation', 'logic_negation', 'logic_boolean'].forEach(function (t) {
    var b = Blockly.Blocks[t]; if (!b) return; var init = b.init;
    b.init = function () { init.call(this); this.setColour(C.logic); };
  });
  ['math_number', 'math_arithmetic'].forEach(function (t) {
    var b = Blockly.Blocks[t]; if (!b) return; var init = b.init;
    b.init = function () { init.call(this); this.setColour(C.math); };
  });
  ['variables_get', 'variables_set', 'math_change'].forEach(function (t) {
    var b = Blockly.Blocks[t]; if (!b) return; var init = b.init;
    b.init = function () { init.call(this); this.setColour(C.vars); };
  });

  /* ---------- 工具箱 ---------- */
  function num(n) { return { kind: 'block', type: 'math_number', fields: { NUM: n } }; }
  function sh(n) { return { shadow: num(n).valueOf() && { type: 'math_number', fields: { NUM: n } } }; }
  function blk(type, inputs, fields) {
    var o = { kind: 'block', type: type };
    if (inputs) { o.inputs = {}; for (var k in inputs) o.inputs[k] = { shadow: { type: 'math_number', fields: { NUM: inputs[k] } } }; }
    if (fields) o.fields = fields;
    return o;
  }
  function toolbox(level) {
    var cats = [];
    cats.push({ kind: 'category', name: '基本', colour: C.basic, contents: [
      blk('f1_on_start'), blk('f1_forever'), blk('f1_pause', { MS: 100 }), blk('f1_show_number', { N: 0 })] });
    cats.push({ kind: 'category', name: '迴圈', colour: C.loops, contents: [blk('f1_repeat', { TIMES: 4 })] });
    if (level >= 2) cats.push({ kind: 'category', name: '邏輯', colour: C.logic, contents: [
      { kind: 'block', type: 'controls_if' },
      { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
      { kind: 'block', type: 'logic_compare', fields: { OP: 'EQ' }, inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      { kind: 'block', type: 'logic_operation', fields: { OP: 'AND' } },
      { kind: 'block', type: 'logic_operation', fields: { OP: 'OR' } },
      { kind: 'block', type: 'logic_negation' }] });
    cats.push({ kind: 'category', name: '變數', colour: C.vars, custom: 'VARIABLE' });
    cats.push({ kind: 'category', name: '數學', colour: C.math, contents: [
      { kind: 'block', type: 'math_number', fields: { NUM: 0 } },
      { kind: 'block', type: 'math_arithmetic', fields: { OP: 'ADD' }, inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
      { kind: 'block', type: 'math_arithmetic', fields: { OP: 'MULTIPLY' }, inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } }] });
    var mq = [blk('f1_mq_init'),
      blk('f1_mq_motor', { S: level >= 2 ? 20 : 100 }, { M: 'A', D: '1' }),
      blk('f1_mq_stop', null, { M: 'A' })];
    if (level >= 2) mq.push({ kind: 'block', type: 'f1_mq_line', fields: { S: '2' } },
      { kind: 'block', type: 'logic_compare', fields: { OP: 'EQ' }, inputs: { A: { block: { type: 'f1_mq_line', fields: { S: '2' } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } });
    mq.push(blk('f1_mq_led', null, { L: 'A', V: '1' }));
    cats.push({ kind: 'category', name: '麥昆Plus V2&V3', colour: C.mq, contents: mq });
    return { kind: 'categoryToolbox', contents: cats };
  }
  window.F1Toolbox = toolbox;

  /* ---------- 共用：取得積木 ---------- */
  function child(b, name) { return b.getInputTargetBlock(name); }
  function stmts(b, name) { var out = [], c = b.getInputTargetBlock(name); while (c) { out.push(c); c = c.getNextBlock(); } return out; }
  function varName(ws, b) { var f = b.getField('VAR'); var v = f && ws.getVariableById(f.getValue()); return v ? v.name : 'x'; }

  /* ---------- 產生器一：模擬器 JavaScript ---------- */
  function SimGen(ws) { this.ws = ws; this.n = 0; }
  SimGen.prototype.expr = function (b) {
    if (!b) return '0';
    var id = JSON.stringify(b.id);
    switch (b.type) {
      case 'math_number': return String(Number(b.getFieldValue('NUM')) || 0);
      case 'math_arithmetic': {
        var op = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' }[b.getFieldValue('OP')] || '+';
        return '(' + this.expr(child(b, 'A')) + ' ' + op + ' ' + this.expr(child(b, 'B')) + ')';
      }
      case 'f1_mq_line': return '(await api.line(' + id + ', ' + b.getFieldValue('S') + '))';
      case 'logic_compare': {
        var o = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }[b.getFieldValue('OP')];
        return '(' + this.expr(child(b, 'A')) + ' ' + o + ' ' + this.expr(child(b, 'B')) + ')';
      }
      case 'logic_operation': {
        var lo = b.getFieldValue('OP') === 'AND' ? '&&' : '||';
        return '(' + this.bool(child(b, 'A')) + ' ' + lo + ' ' + this.bool(child(b, 'B')) + ')';
      }
      case 'logic_negation': return '(!' + this.bool(child(b, 'BOOL')) + ')';
      case 'logic_boolean': return b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false';
      case 'variables_get': return '(V[' + JSON.stringify(varName(this.ws, b)) + '] || 0)';
      default: return '0';
    }
  };
  SimGen.prototype.bool = function (b) { return b ? this.expr(b) : 'false'; };
  SimGen.prototype.list = function (arr, ind) { var self = this; return arr.map(function (b) { return self.stmt(b, ind); }).join(''); };
  SimGen.prototype.stmt = function (b, ind) {
    var id = JSON.stringify(b.id), p = ind, s = '';
    switch (b.type) {
      case 'f1_pause': return p + 'await api.pause(' + id + ', ' + this.expr(child(b, 'MS')) + ');\n';
      case 'f1_show_number': return p + 'await api.show(' + id + ', ' + this.expr(child(b, 'N')) + ');\n';
      case 'f1_mq_init': return p + 'await api.init(' + id + ');\n';
      case 'f1_mq_motor': return p + 'await api.motor(' + id + ', "' + b.getFieldValue('M') + '", ' + b.getFieldValue('D') + ', ' + this.expr(child(b, 'S')) + ');\n';
      case 'f1_mq_stop': return p + 'await api.stop(' + id + ', "' + b.getFieldValue('M') + '");\n';
      case 'f1_mq_led': return p + 'await api.led(' + id + ', "' + b.getFieldValue('L') + '", ' + b.getFieldValue('V') + ');\n';
      case 'f1_repeat': {
        var v = 'i' + (++this.n);
        s += p + 'for (let ' + v + ' = 0, ' + v + 'n = ' + this.expr(child(b, 'TIMES')) + '; ' + v + ' < ' + v + 'n; ' + v + '++) {\n';
        s += p + '  await api.op(' + id + ');\n' + this.list(stmts(b, 'DO'), p + '  ') + p + '}\n';
        return s;
      }
      case 'controls_if': {
        var k = 0;
        s += p + 'await api.op(' + id + ');\n';
        while (b.getInput('IF' + k)) {
          s += p + (k ? '} else if (' : 'if (') + this.bool(child(b, 'IF' + k)) + ') {\n' + this.list(stmts(b, 'DO' + k), p + '  ');
          k++;
        }
        if (b.getInput('ELSE')) s += p + '} else {\n' + this.list(stmts(b, 'ELSE'), p + '  ');
        return s + p + '}\n';
      }
      case 'variables_set': return p + 'await api.op(' + id + '); V[' + JSON.stringify(varName(this.ws, b)) + '] = ' + this.expr(child(b, 'VALUE')) + ';\n';
      case 'math_change': return p + 'await api.op(' + id + '); V[' + JSON.stringify(varName(this.ws, b)) + '] = (V[' + JSON.stringify(varName(this.ws, b)) + '] || 0) + ' + this.expr(child(b, 'DELTA')) + ';\n';
      default: return p + 'await api.op(' + id + ');\n';
    }
  };
  // 回傳 {code, starts, forevers, loose}
  function analyse(ws) {
    var tops = ws.getTopBlocks(true), starts = [], forevers = [], loose = [];
    tops.forEach(function (b) {
      if (b.type === 'f1_on_start') starts.push(b);
      else if (b.type === 'f1_forever') forevers.push(b);
      else loose.push(b);
    });
    return { starts: starts, forevers: forevers, loose: loose };
  }
  function simCode(ws) {
    var a = analyse(ws), g = new SimGen(ws), body = '';
    if (a.starts[0]) body += g.list(stmts(a.starts[0], 'DO'), '  ');
    if (a.forevers[0]) {
      body += '  for (;;) {\n    api.check();\n' + g.list(stmts(a.forevers[0], 'DO'), '    ') + '    await api.foreverGap();\n  }\n';
    }
    a.code = 'return (async function (api) {\n  const V = {};\n' + body + '});';
    return a;
  }

  /* ---------- 產生器二：MakeCode TypeScript ---------- */
  var MQ_M = { A: 'AllMotor', L: 'LeftMotor', R: 'RightMotor' };
  var MQ_S = ['SensorL2', 'SensorL1', 'SensorM', 'SensorR1', 'SensorR2'];
  var MQ_L = { A: 'AllLed', L: 'LeftLed', R: 'RightLed' };
  function TsGen(ws) { this.ws = ws; this.vars = {}; this.loopN = 0; }
  TsGen.prototype.expr = function (b) {
    if (!b) return '0';
    switch (b.type) {
      case 'math_number': return String(Number(b.getFieldValue('NUM')) || 0);
      case 'math_arithmetic': {
        var op = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' }[b.getFieldValue('OP')] || '+';
        return this.expr(child(b, 'A')) + ' ' + op + ' ' + this.expr(child(b, 'B'));
      }
      case 'f1_mq_line': return 'maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.' + MQ_S[+b.getFieldValue('S')] + ')';
      case 'logic_compare': {
        var o = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }[b.getFieldValue('OP')];
        return this.expr(child(b, 'A')) + ' ' + o + ' ' + this.expr(child(b, 'B'));
      }
      case 'logic_operation': return '(' + this.bool(child(b, 'A')) + ') ' + (b.getFieldValue('OP') === 'AND' ? '&&' : '||') + ' (' + this.bool(child(b, 'B')) + ')';
      case 'logic_negation': return '!(' + this.bool(child(b, 'BOOL')) + ')';
      case 'logic_boolean': return b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false';
      case 'variables_get': { var n = varName(this.ws, b); this.vars[n] = 1; return n; }
      default: return '0';
    }
  };
  TsGen.prototype.bool = function (b) { return b ? this.expr(b) : 'false'; };
  TsGen.prototype.list = function (arr, ind) { var self = this; return arr.map(function (b) { return self.stmt(b, ind); }).join(''); };
  TsGen.prototype.stmt = function (b, p) {
    switch (b.type) {
      case 'f1_pause': return p + 'basic.pause(' + this.expr(child(b, 'MS')) + ')\n';
      case 'f1_show_number': return p + 'basic.showNumber(' + this.expr(child(b, 'N')) + ')\n';
      case 'f1_mq_init': return p + 'maqueenPlusV2.I2CInit()\n';
      case 'f1_mq_motor': return p + 'maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.' + MQ_M[b.getFieldValue('M')] + ', maqueenPlusV2.MyEnumDir.' + (b.getFieldValue('D') === '1' ? 'Forward' : 'Backward') + ', ' + this.expr(child(b, 'S')) + ')\n';
      case 'f1_mq_stop': return p + 'maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.' + MQ_M[b.getFieldValue('M')] + ')\n';
      case 'f1_mq_led': return p + 'maqueenPlusV2.controlLED(maqueenPlusV2.MyEnumLed.' + MQ_L[b.getFieldValue('L')] + ', maqueenPlusV2.MyEnumSwitch.' + (b.getFieldValue('V') === '1' ? 'Open' : 'Close') + ')\n';
      case 'f1_repeat': {
        var v = this.loopN++ ? 'index' + this.loopN : 'index';
        return p + 'for (let ' + v + ' = 0; ' + v + ' < ' + this.expr(child(b, 'TIMES')) + '; ' + v + '++) {\n' + this.list(stmts(b, 'DO'), p + '    ') + p + '}\n';
      }
      case 'controls_if': {
        var s = '', k = 0;
        while (b.getInput('IF' + k)) { s += (k ? p + '} else if (' : p + 'if (') + this.bool(child(b, 'IF' + k)) + ') {\n' + this.list(stmts(b, 'DO' + k), p + '    '); k++; }
        if (b.getInput('ELSE')) s += p + '} else {\n' + this.list(stmts(b, 'ELSE'), p + '    ');
        return s + p + '}\n';
      }
      case 'variables_set': { var n = varName(this.ws, b); this.vars[n] = 1; return p + n + ' = ' + this.expr(child(b, 'VALUE')) + '\n'; }
      case 'math_change': { var m = varName(this.ws, b); this.vars[m] = 1; return p + m + ' += ' + this.expr(child(b, 'DELTA')) + '\n'; }
      default: return '';
    }
  };
  function tsCode(ws) {
    var a = analyse(ws), g = new TsGen(ws), out = '';
    var start = a.starts[0] ? g.list(stmts(a.starts[0], 'DO'), '') : '';
    var forever = a.forevers[0] ? 'basic.forever(function () {\n' + g.list(stmts(a.forevers[0], 'DO'), '    ') + '})\n' : '';
    var decl = Object.keys(g.vars).map(function (n) { return 'let ' + n + ' = 0\n'; }).join('');
    out = decl + start + forever;
    return out.trim() + '\n';
  }

  window.F1Gen = { simCode: simCode, tsCode: tsCode, analyse: analyse, stmts: stmts };
})();
