"""成績收集器測試：重複上傳取最高分、兩人一組、名單、豁免／老師輸入、欠交名單、CSV、備份還原、真報告。
執行：python3 tools/test_collector.py"""
import os, re, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
U = lambda p: 'file://' + ROOT + '/' + p
PIN = re.search(r"TEACHER_PIN:\s*'([^']+)'", open(ROOT + '/assets/config.js').read()).group(1)
fails = []
def check(cond, msg):
    print(('  ✔ ' if cond else '  ✘ ') + msg)
    if not cond: fails.append(msg)

MAKE = """(o) => {
  var d = Object.assign({ app: F1CONFIG.APP, v: 't', title: o.lesson, partner: null, max: 50, items: [], exported: Date.now() }, o.d);
  d.lesson = o.lesson; d.items = d.items.length ? d.items : [{ key: 'a', label: '1. 練習', score: d.total, max: d.max, done: true }];
  var p = JSON.stringify(d), sig = SHA.hmac(F1CONFIG.SIGN_KEY, p);
  if (o.tamper) p = p.replace('"total":' + d.total, '"total":' + (d.total + 5));
  return '<script type="application/json" id="f1-report">' + JSON.stringify({ payload: p, sig: sig }) + '<\\/script>';
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U('teacher/collector.html')); pg.evaluate("localStorage.removeItem('f1dt:collector')")
    pg.fill('#pin', PIN); pg.click('#go'); pg.wait_for_timeout(300)

    print('1. 名單及上傳')
    pg.fill('#roster', '班別\t學號\t姓名\n1A\t1\t陳大文\n1A\t2\t李小明\n1A\t3\t張三\n1A\t4\t何四\n1B\t1\t王五')
    pg.click('#saveRoster')
    check('5 人' in pg.inner_text('#rosterInfo'), '名單 5 人（標題行略過）')
    T = 1760000000000
    reps = [
        dict(lesson='L1', d=dict(cls='1A', no='1', name='陳大文', total=30, exported=T)),
        dict(lesson='L1', d=dict(cls='1a', no='01', name='陳大文', total=42, exported=T + 1000)),
        dict(lesson='L1', d=dict(cls='1A', no='1', name='陳大文', total=45, exported=T + 2000), tamper=True),
        dict(lesson='L2', d=dict(cls='1A', no='1', name='陳大文', partner={'no': '2', 'name': '李小明'}, total=40, exported=T)),
        dict(lesson='L2', d=dict(cls='1A', no='2', name='李小明', total=35, exported=T + 5000)),
        dict(lesson='L3', d=dict(cls='1A', no='1', name='陳大文', total=25, items=[
            {'key': 'a', 'label': '1. 讀1定0', 'score': 10, 'max': 10, 'done': True},
            {'key': 'b', 'label': '2. 提速記錄', 'score': 0, 'max': 15, 'done': False},
            {'key': 'c', 'label': '3. 老師驗收', 'score': 15, 'max': 25, 'done': True, 'detail': {'type': 'verify', 'ok': True, 'lv': '部分完成'}}])),
        dict(lesson='L1', d=dict(cls='1A', no='9', name='錯人', total=20)),
        dict(lesson='L1', d=dict(cls='1B', no='1', name='王五', total=80, max=100)),
        dict(lesson='L4', d=dict(cls='1B', no='1', name='王五', total=48)),
    ]
    for r in reps:
        html = pg.evaluate(MAKE, r); pg.evaluate("t => F1Collector.addText(t, 'x.html')", html)
    dup = pg.evaluate(MAKE, reps[0]); pg.evaluate("t => F1Collector.addText(t, 'x.html')", dup)
    check(len(pg.evaluate("Object.keys(F1Collector.state().reps)")) == len(reps), '完全相同的檔案不會重複計')

    print('2. 取最高分、兩人一組、名單外')
    m = pg.evaluate("""() => { var M = F1Collector.model(), o = {}; M.order.forEach(function (k) { var s = M.stu[k], t = F1Collector.sumOf(s);
        o[k] = { name: s.name, inRoster: s.inRoster, L1: s.L.L1 && s.L.L1.best ? s.L.L1.best.sc : null, n1: s.L.L1 ? s.L.L1.nGood : 0, bad1: s.L.L1 ? s.L.L1.nBad : 0,
                 L2: s.L.L2 && s.L.L2.best ? s.L.L2.best.sc : null, n2: s.L.L2 ? s.L.L2.nGood : 0, gaps3: s.L.L3 ? s.L.L3.gaps.length : 0, t: t }; }); return o; }""")
    a = m['1A|1']
    check(a['L1'] == 42 and a['n1'] == 2 and a['bad1'] == 1, '1A 1：L1 三份取最高的有效分 42（篡改的 45 不計）')
    check(m['1A|2']['L2'] == 40 and m['1A|2']['n2'] == 2, '1A 2：組員報告 40 分高過自己的 35 分 → 40')
    check(a['gaps3'] == 1, '1A 1：L3 有 1 項未完成（漏 1）')
    check(a['t']['raw'] == 107 and a['t']['fin'] == 107 and not a['t']['miss'], '1A 1：總分 42＋40＋25＝107，齊')
    check(m['1A|3']['t']['miss'] == ['L1', 'L2', 'L3'] and m['1A|3']['t']['fin'] == 0, '1A 3：三課都欠')
    check(m['1A|9']['inRoster'] is False, '1A 9 不在名單內')
    check(m['1B|1']['L1'] == 40, '1B 1：80/100 換算為 40/50')
    check(m['1B|1']['t']['raw'] == 40, '1B 1：第四堂預設不計分')
    tbl = pg.inner_text('#tbl')
    check('欠' in tbl and '漏 1' in tbl and '×2' in tbl and '名單外' in tbl, '成績表顯示 欠、漏、×2、名單外')

    print('3. 豁免及老師輸入')
    pg.locator('td.cell[data-k="1A|2"][data-l="L3"]').click()
    pg.check('.modal input[name=mk][value=ex]'); pg.fill('#mkNote', '病假'); pg.click('.modal [data-ok]')
    t = pg.evaluate("F1Collector.sumOf(F1Collector.model().stu['1A|2'])")
    check(t['mx'] == 100 and t['raw'] == 40 and t['fin'] == 60 and t['miss'] == ['L1'], '1A 2 L3 豁免：40/100 × 150 ＝ 60，仍欠 L1')
    pg.locator('td.cell[data-k="1A|4"][data-l="L1"]').click()
    pg.check('.modal input[name=mk][value=man]'); pg.fill('#mkScore', '33'); pg.fill('#mkNote', '遺失報告，按驗收記錄'); pg.click('.modal [data-ok]')
    t = pg.evaluate("F1Collector.sumOf(F1Collector.model().stu['1A|4'])")
    check(t['raw'] == 33, '1A 4 L1 老師輸入 33 分')
    pg.locator('td.cell[data-k="1A|1"][data-l="L1"]').click()
    check('採用' in pg.inner_text('.modal') and '✘ 不計' in pg.inner_text('.modal'), '詳情列出所有上傳，標明採用及不計')
    pg.click('.modal [data-close]')

    print('4. 欠交名單、CSV、儲存、備份')
    pg.click('#missing')
    mt = pg.input_value('#missText')
    check('第一堂 欠交' in mt and '1A 3 張三' in mt and '未完成：提速記錄' in mt, '欠交名單包括欠交及未完成項目')
    pg.locator('#tabs button', has_text='1A').first.click()
    with pg.expect_download() as dl: pg.click('#csv')
    csv = open(dl.value.path(), encoding='utf-8-sig').read()
    check('病假' in csv and '老師輸入' in csv and '欠' in csv and '1B' not in csv, 'CSV 只匯出 1A，包括備註')
    pg.reload(); pg.wait_for_timeout(300)
    check(pg.evaluate("Object.keys(F1Collector.state().reps).length") == len(reps), '重新開頁資料仍在')
    with pg.expect_download() as dl2: pg.click('#backup')
    bk = dl2.value.path()
    pg.evaluate("localStorage.removeItem('f1dt:collector')"); pg.reload(); pg.wait_for_timeout(300)
    pg.set_input_files('#restore', bk); pg.wait_for_timeout(400)
    check(pg.evaluate("Object.keys(F1Collector.state().reps).length") == len(reps) and pg.evaluate("F1Collector.state().marks['1A|2|L3'].type") == 'ex', '匯入備份還原報告及調整')

    print('5. 真的成績報告')
    lp = ctx.new_page(); lp.goto(U('L1/index.html')); lp.wait_for_timeout(400)
    lp.fill('#f_cls', '1A'); lp.fill('#f_num', '3'); lp.fill('#f_name', '張三')
    with lp.expect_download() as d3: lp.locator('#submitBtns .btn.go').click()
    pg.bring_to_front(); pg.set_input_files('#file', d3.value.path()); pg.wait_for_timeout(500)
    check('新增 1 份' in pg.inner_text('#msg'), '上傳真報告')
    s = pg.evaluate("F1Collector.model().stu['1A|3'].L.L1")
    check(s is not None and s['best'] is not None, '真報告記入 1A 3 第一堂')
    check(not errs, '沒有頁面錯誤 ' + str(errs[:2]))
    b.close()
print('\n結果：' + ('全部通過' if not fails else '失敗 %d 項' % len(fails)))
