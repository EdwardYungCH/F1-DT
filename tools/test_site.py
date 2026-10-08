"""全站測試：頁面錯誤、手機版、練習流程、老師驗收、報告驗證及篡改、成績匯總工具、身份確認。
執行：python3 tools/test_site.py"""
import os, sys, json, re, time
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
U = lambda p: 'file://' + ROOT + '/' + p
PIN = re.search(r"TEACHER_PIN:\s*'([^']+)'", open(ROOT + '/assets/config.js').read()).group(1)
fails = []
def check(cond, msg):
    print(('  ✔ ' if cond else '  ✘ ') + msg)
    if not cond: fails.append(msg)

def errs_of(pg):
    e = []
    pg.on('pageerror', lambda x: e.append(str(x)))
    pg.on('console', lambda m: e.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'ERR_' not in m.text else None)
    return e

def pick_sheet(pg, text):
    pg.wait_for_selector('.sheet .choice')
    pg.locator('.sheet .choice', has_text=text).first.click()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page(); E = errs_of(pg)

    print('1. 每頁載入沒有錯誤')
    for page in ['index.html', 'L1/index.html', 'L2/index.html', 'L3/index.html', 'L4/index.html', 'sim/index.html?m=l3lap', 'sim/index.html?m=l2sq', 'tools/mcblocks/render.html', 'project.html', 'teacher/index.html', 'teacher/summary.html']:
        E.clear(); pg.goto(U(page)); pg.wait_for_timeout(700)
        check(not E, page + ' 沒有錯誤 ' + (str(E) if E else ''))

    print('2. 手機版沒有左右捲動')
    m = b.new_context(viewport={'width': 390, 'height': 844}); mp = m.new_page()
    for page in ['index.html', 'L1/index.html', 'L2/index.html', 'L3/index.html', 'L4/index.html', 'project.html']:
        mp.goto(U(page)); mp.wait_for_timeout(600)
        w = mp.evaluate('document.documentElement.scrollWidth')
        check(w <= 392, page + f' 手機闊度 {w}px')
    m.close()

    print('3. 第一堂練習流程')
    pg.goto(U('L1/index.html')); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.fill('#f_cls', '1a'); pg.fill('#f_num', '12'); pg.fill('#f_name', '陳大文')
    check(pg.evaluate("JSON.parse(localStorage.getItem('f1dt:student')).cls") == '1A', '班別自動轉大楷')
    # 填充
    for i, w in enumerate(['sense', 'environment', 'decisions', 'program', 'actions']):
        pg.locator('#q-fill .blank').nth(i).click(); pick_sheet(pg, w)
    pg.click('#q-fill ~ .btnrow .btn, #s1 .btnrow .btn.primary')
    check('5 / 5' in pg.inner_text('#s1'), '填充全對得 5 分')
    # 分類：全部按「機械人」（部分對）
    cards = pg.locator('#q-robot .qcard')
    for i in range(cards.count()): cards.nth(i).locator('.opt', has_text='機械人').first.click()
    s = pg.inner_text('#s2'); check('第一次作答成績：3 / 9' in s, '分類以第一次作答計 3/9')
    cards.nth(0).locator('.opt', has_text='都不是').click()
    check('第一次作答成績：3 / 9' in pg.inner_text('#s2'), '再答不改第一次成績')
    # 配對
    ans = {'工業機械手臂': '工廠', '送餐機械人': '餐廳', '自動掃地機械人': '吸塵', '升降機': '樓層', '自動門': '自動打開'}
    rows = pg.locator('#q-match tbody tr')
    for i in range(rows.count()):
        name = rows.nth(i).locator('td').first.inner_text().strip()
        rows.nth(i).locator('.pick').click(); pick_sheet(pg, ans[name])
    pg.locator('#s3 .btn.primary').click()
    check('5 / 5' in pg.inner_text('#s3'), '配對全對')
    # 討論
    pg.locator('#d1 textarea').fill('比賽可以測試機械人的平衡和反應，將來可以用來救災和照顧長者。')
    pg.locator('#d2 textarea').fill('短')
    pg.wait_for_timeout(800)
    pg.reload(); pg.wait_for_timeout(600)
    tot = pg.inner_text('.topbar .pill')
    check(tot.startswith('27.3'), '重新載入後分數保留（10+3.3+10+4）：' + tot)
    check('5 / 5' in pg.inner_text('#s3'), '配對結果保留')

    print('4. 下載報告、驗證碼及篡改')
    with pg.expect_download() as dl:
        pg.locator('#submitBtns .btn.go').click()
    path = dl.value.path(); html = open(path, encoding='utf-8-sig').read()
    check(dl.value.suggested_filename == 'DT_F1_L1_1A_12_陳大文.html', '報告檔名 ' + dl.value.suggested_filename)
    check('已下載成績報告' in pg.inner_text('.modal'), '下載後提示清除資料')
    pg.locator('.modal .btn').first.click()
    rp = ctx.new_page(); RE = errs_of(rp)
    tmp = ROOT + '/tools/_report.html'; open(tmp, 'w', encoding='utf-8').write(html)
    rp.goto(U('tools/_report.html')); rp.wait_for_timeout(500)
    check('驗證碼正確' in rp.inner_text('body'), '報告：驗證碼正確')
    check('陳大文' in rp.inner_text('body') and '27.3' in rp.inner_text('.rscore'), '報告：姓名及分數')
    check(not RE, '報告沒有錯誤 ' + str(RE))
    tampered = html.replace('\\"total\\":27.3', '\\"total\\":49', 1)
    check(tampered != html, '已製作篡改版本')
    open(tmp, 'w', encoding='utf-8').write(tampered); rp.goto(U('tools/_report.html')); rp.wait_for_timeout(400)
    check('驗證失敗' in rp.inner_text('body'), '報告：篡改後驗證失敗')

    print('5. 成績匯總工具')
    sp = ctx.new_page(); SE = errs_of(sp)
    sp.goto(U('teacher/summary.html')); sp.fill('#pin', PIN); sp.click('#go'); sp.wait_for_timeout(300)
    r = sp.evaluate('t => F1Summary.addText(t, "a.html").ok', html)
    check(r is True, '匯總工具：真報告驗證正確')
    r2 = sp.evaluate('t => F1Summary.addText(t, "b.html").ok', tampered)
    check(r2 is False, '匯總工具：篡改報告驗證失敗')
    t = sp.inner_text('#tbl'); check('陳大文' in t, '匯總工具成績表')
    check('2. 機械人／自動化系統分類' in sp.inner_text('#items'), '匯總工具題目分析')
    with sp.expect_download() as d2: sp.click('#csv')
    csv = open(d2.value.path(), encoding='utf-8-sig').read()
    check('陳大文' in csv and '總分' in csv, 'CSV 匯出')
    check(not SE, '匯總工具沒有錯誤')
    os.remove(tmp)

    print('6. 身份確認（共用電腦）')
    pg.evaluate("var d=JSON.parse(localStorage.getItem('f1dt:L1')); d.lastActive=Date.now()-3600000; localStorage.setItem('f1dt:L1', JSON.stringify(d));")
    pg.reload(); pg.wait_for_timeout(500)
    check('你是 1A 12 陳大文 嗎' in pg.inner_text('body'), '一小時後開頁會問身份')
    pg.locator('.modal .btn', has_text='不是').click(); pg.wait_for_timeout(800)
    check(pg.evaluate("localStorage.getItem('f1dt:L1')") is None or '0 / 50' in pg.inner_text('.topbar .pill'), '答「不是」會清空')

    print('7. 第二堂：拆解、試驗記錄、模擬器、老師驗收')
    pg.goto(U('L2/index.html')); pg.wait_for_timeout(500)
    check('1A_12_square' in pg.inner_text('#s1'), '專案名稱提示（共用學生資料）')
    check(pg.locator('#q-parts, #q-order, #q-adjust').count() == 0, '第二堂沒有練習題')
    pg.fill('#f_cls', '1a'); pg.fill('#f_num', '12'); pg.fill('#f_name', '陳大文')
    pg.fill('#f_pnum', '5'); pg.fill('#f_pname', '李小明')
    check('陳大文＋李小明' in pg.inner_text('.topbar'), '頂部列顯示兩位組員')
    check(pg.locator('.simcard, iframe').count() == 0, '第二堂沒有模擬器')
    r0 = pg.locator('#trials tr.r').nth(0)
    r0.locator('input[data-k=f]').fill('3000'); r0.locator('.pick').nth(0).click(); pick_sheet(pg, '太短')
    r0.locator('input[data-k=t]').fill('1000'); r0.locator('.pick').nth(1).click(); pick_sheet(pg, '太少')
    check('forward 改 3200' in r0.inner_text(), '記錄表建議 forward 改 3200')
    pg.locator('#trials .btn.go').click()
    r3 = pg.locator('#trials tr.r').nth(3)
    check(r3.locator('input[data-k=f]').input_value() == '3200' and r3.locator('input[data-k=t]').input_value() == '1000', '新增一行自動帶入 3200／1000')
    r1 = pg.locator('#trials tr.r').nth(1)
    r1.locator('input[data-k=f]').fill('3200'); r1.locator('.pick').nth(0).click(); pick_sheet(pg, '剛好')
    r1.locator('input[data-k=t]').fill('1000'); r1.locator('.pick').nth(1).click(); pick_sheet(pg, '太少')
    check('turn 改 1050' in r1.inner_text(), '邊長剛好才建議改 turn 1050')
    pg.locator('#verify .btn').click(); pg.fill('.modal input', 'wrong'); pg.locator('.modal .btn.primary').click()
    check('密碼不正確' in pg.inner_text('.modal'), '老師驗收：錯密碼被拒')
    pg.fill('.modal input', PIN); pg.locator('.modal .btn.primary').click()
    check('老師已驗收' in pg.inner_text('#verify'), '老師驗收：正確密碼')
    pg.locator('#mclink input').fill('https://makecode.com/_abcDEF123456')
    check('格式正確' in pg.inner_text('#mclink'), 'MakeCode 連結格式檢查')
    pg.reload(); pg.wait_for_timeout(600)
    tot = pg.inner_text('.topbar .pill'); check(tot.startswith('35'), '第二堂分數（記錄 10＋驗收 25）：' + tot)
    check(pg.input_value('#f_pname') == '李小明', '組員二資料保留')
    with pg.expect_download() as dl2:
        pg.locator('#submitBtns .btn.go').click()
    check(dl2.value.suggested_filename == 'DT_F1_L2_1A_12_陳大文_5_李小明.html', '兩人報告檔名 ' + dl2.value.suggested_filename)
    html2 = open(dl2.value.path(), encoding='utf-8-sig').read()
    pg.locator('.modal .btn').first.click()
    sp.goto(U('teacher/summary.html')); sp.wait_for_timeout(300)
    if sp.locator('#pin').is_visible(): sp.fill('#pin', PIN); sp.click('#go')
    sp.evaluate('t => F1Summary.addText(t, "pair.html")', html2); sp.wait_for_timeout(200)
    sp.locator('#tabs button', has_text='第二堂').click()
    t2 = sp.inner_text('#tbl')
    check('陳大文' in t2 and '李小明' in t2 and t2.count('35 / 50') >= 2, '匯總工具為兩位組員各記一行')
    check(pg.locator('.toc, .tbtn.speak, .tbtn.fs, .lesson-nav').count() == 0, '沒有目錄、朗讀、字體大小、上下課連結')
    for page in ['L1', 'L2', 'L3', 'L4']:
        pg.goto(U(page + '/index.html')); pg.wait_for_timeout(300)
        hrefs = pg.eval_on_selector_all('a[href]', 'as => as.map(a => a.getAttribute("href"))')
        bad = [h for h in hrefs if not h.startswith('../sim/') and (re.search(r'(^|/)(L\d|index\.html)', h) or h.startswith('../'))]
        check(not bad, page + ' 沒有連往其他課或首頁的連結 ' + (str(bad) if bad else ''))

    print('8. 第三、四堂主要互動')
    pg.goto(U('L3/index.html')); pg.wait_for_timeout(400)
    check(pg.locator('#after-predict').is_hidden(), '預測前看不到模擬器及比較表')
    pg.locator('#predict .opt').nth(2).click()
    check(pg.locator('#after-predict').is_visible(), '預測後才顯示')
    rows = pg.locator('#q-act .qrow'); rows.nth(1).locator('.opt', has_text='向左修正').click()
    check('第一次已答對' in rows.nth(1).inner_text() or '答對了' in rows.nth(1).inner_text(), '理想動作 110 → 向左修正')
    pg.goto(U('L4/index.html')); pg.wait_for_timeout(400)
    pg.locator('#q-flow .btn.ghost').click(); pg.wait_for_timeout(300)
    check('全部馬達' in pg.inner_text('#flow') and '0 / 6' in pg.inner_text('#s4') or '0 / 10' in pg.inner_text('#s4'), '顯示正確流程圖（0 分）')
    tier = ['前進 40', '② 左側停止', '② 左側前進 40', '③ 左側後退', '③ 左側前進 40', '全部馬達 停止']
    rows = pg.locator('#q-tier tbody tr')
    for i, w in enumerate(tier): rows.nth(i).locator('.pick').click(); pick_sheet(pg, w)
    pg.locator('#s6 .btnrow .btn.primary').first.click()
    check('6 / 6' in pg.inner_text('#s6'), '分層修正流程圖全對')
    check('左側 後退 20' in pg.inner_text('#tier'), '分層流程圖即時顯示答案')

    print('9. 老師區密碼')
    tp = ctx.new_page(); tp.goto(U('teacher/index.html'))
    check(tp.locator('#main').is_hidden(), '未輸入密碼看不到內容')
    tp.fill('#pin', PIN); tp.click('#go'); check(tp.locator('#main').is_visible(), '輸入密碼後看到')
    b.close()

print('\n結果：' + ('全部通過' if not fails else f'{len(fails)} 項失敗：' + '；'.join(fails)))
sys.exit(1 if fails else 0)
