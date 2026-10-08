"""Playwright test for the simulator: page loads, programs pass/fail as expected."""
import os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def url(m, seed='1A-01'):
    return 'file://' + ROOT + '/sim/index.html?m=' + m + '&seed=' + seed

def run_case(pg, m, xml, timeout=120000, speed=10):
    pg.goto(url(m)); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.clear()")
    pg.goto(url(m)); pg.wait_for_function("window.F1SimApp && window.F1SimApp.ws")
    if xml: pg.evaluate("x => F1SimApp.load(x)", xml)
    pg.evaluate("v => F1SimApp.setSpeed(v)", speed)
    pg.click('#btnRun')
    pg.wait_for_function("document.querySelector('#result').classList.contains('pass') || document.querySelector('#result').classList.contains('fail')", timeout=timeout)
    return pg.eval_on_selector('#result', 'e => [e.className, e.innerText]')

if __name__ == '__main__':
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 860})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
        pg.goto(url('l3poe')); pg.wait_for_timeout(1500)
        pg.screenshot(path='/tmp/claude-0/-home-claude/5be7f1f4-bc47-523c-8ed9-8064bc377622/scratchpad/sim_l2poe.png')
        print('errors after load:', errs)
        res = run_case(pg, 'l3poe', None)
        print('l2poe starter (stop):', res)
        b.close()

TIER = open(os.path.join(ROOT,'tools','render_blocks.py')).read().split("TIER = \"\"\"")[1].split('\"\"\"')[0].replace('X.', 'F1Xml.').replace('var c=X', 'var c=F1Xml')
CASES = {
  # mission: [(label, js-expression-building-xml or None, expect)]
  'l3poe': [('stop (starter)', None, 'fail'),
            ('back', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000))) + F1Xml.forever(F1Xml.follower('back'),30,170))", 'pass')],
  'l2sq': [('square 50: 5600/1020', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000,'<block type=\"f1_repeat\"><value name=\"TIMES\">'+F1Xml.n(4)+'</value><statement name=\"DO\">'+F1Xml.motor('A','1',50,F1Xml.pause(5600,F1Xml.stop('A',F1Xml.pause(500,F1Xml.motor('L','1',50,F1Xml.motor('R','-1',50,F1Xml.pause(1020,F1Xml.stop('A',F1Xml.pause(500)))))))))+'</statement></block>'))))", 'pass'),
          ('starter numbers 5000/1000', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000,'<block type=\"f1_repeat\"><value name=\"TIMES\">'+F1Xml.n(4)+'</value><statement name=\"DO\">'+F1Xml.motor('A','1',50,F1Xml.pause(5000,F1Xml.stop('A',F1Xml.pause(500,F1Xml.motor('L','1',50,F1Xml.motor('R','-1',50,F1Xml.pause(1000,F1Xml.stop('A',F1Xml.pause(500)))))))))+'</statement></block>'))))", 'fail'),
          ('speed 100', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000,'<block type=\"f1_repeat\"><value name=\"TIMES\">'+F1Xml.n(4)+'</value><statement name=\"DO\">'+F1Xml.motor('A','1',100,F1Xml.pause(2650,F1Xml.stop('A',F1Xml.pause(500,F1Xml.motor('L','1',100,F1Xml.motor('R','-1',100,F1Xml.pause(490,F1Xml.stop('A',F1Xml.pause(500)))))))))+'</statement></block>'))))", 'fail'),
          ('no repeat (one side)', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.motor('A','1',50,F1Xml.pause(5600,F1Xml.stop('A'))))))", 'fail')],
  'l3lap': [('follower back', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000))) + F1Xml.forever(F1Xml.follower('back'),30,170))", 'pass'),
            ('in on-start only', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000,F1Xml.follower('back')))))", 'fail')],
  'l4tier': [('L2 program', "F1Xml.x(F1Xml.start(F1Xml.init(F1Xml.pause(1000))) + F1Xml.forever(F1Xml.follower('back'),30,170))", 'fail'),
             ('tier 40/20', TIER, 'pass')],
}
def main2():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 860})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        bad = 0
        for m, cases in CASES.items():
            for label, js, expect in cases:
                pg.goto(url(m)); pg.wait_for_function("window.F1SimApp && window.F1SimApp.ws")
                pg.evaluate("localStorage.clear()")
                xml = pg.evaluate(js) if js else None
                r = run_case(pg, m, xml)
                ok = expect == 'any' or (expect in r[0])
                bad += 0 if ok else 1
                print(('OK ' if ok else 'BAD'), m, label, '->', r[1].replace('\n', ' | ')[:160])
        print('page errors:', errs)
        b.close()
        return bad
if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'cases':
    sys.exit(main2())
