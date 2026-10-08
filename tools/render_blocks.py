"""用 MakeCode 的積木外觀（pxt-blockly 的 pxt renderer，放在 tools/mcblocks/）把程式積木輸出成 PNG。
執行：python3 tools/render_blocks.py"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROGS = {
 'blocks-sq-full': "X.squareV(3000, 1000)",
 'mc-on-start': "X.x(X.start(''))",
 'mc-set-var': "X.x(X.vdecl([X.VF]) + X.setv(X.VF, 3000))",
 'mc-pause': "X.x(X.pause(100))",
 'mc-repeat': "X.x(X.repeat(4, ''))",
 'mc-init': "X.x(X.init())",
 'mc-motor': "X.x(X.motor('A','1',50))",
 'mc-stop': "X.x(X.stop('A'))",
 'blocks-l2-full': "X.x(X.start(X.init(X.pause(1000))) + X.forever(X.follower('back'),30,170))",
 'blocks-l2-stop': "X.x(X.forever(X.follower('stop'),30,30))",
}
TIER = """(function(){var c=X.cond, m=X.motor, s=X.stop;
 var b='<block type="controls_if"><mutation elseif="4" else="1"></mutation>'+
 '<value name="IF0">'+c(2)+'</value><statement name="DO0">'+m('A','1',40)+'</statement>'+
 '<value name="IF1">'+c(1)+'</value><statement name="DO1">'+s('L',m('R','1',40))+'</statement>'+
 '<value name="IF2">'+c(3)+'</value><statement name="DO2">'+m('L','1',40,s('R'))+'</statement>'+
 '<value name="IF3">'+c(0)+'</value><statement name="DO3">'+m('L','-1',20,m('R','1',40))+'</statement>'+
 '<value name="IF4">'+c(4)+'</value><statement name="DO4">'+m('L','1',40,m('R','-1',20))+'</statement>'+
 '<statement name="ELSE">'+s('A')+'</statement></block>';
 return X.x(X.start(X.init(X.pause(1000))) + X.forever(b,30,170));})()"""
PROGS['blocks-l3-tier'] = TIER
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1400, 'height': 1300}, device_scale_factor=2)
    pg.goto('file://' + ROOT + '/tools/mcblocks/render.html'); pg.wait_for_function('window.show && window.F1Xml')
    for name, js in PROGS.items():
        xml = pg.evaluate('(function(){var X=F1Xml; return ' + js + ';})()')
        pg.evaluate('x => show(x)', xml)
        pg.wait_for_timeout(250)
        box = pg.evaluate("""() => { const c = document.querySelector('.blocklyBlockCanvas').getBoundingClientRect(); return {x:Math.max(0,c.x-6),y:Math.max(0,c.y-6),width:c.width+12,height:c.height+12}; }""")
        pg.screenshot(path=os.path.join(ROOT, 'assets', 'img', name + '.png'), clip=box, omit_background=True)
        print(name, int(box['width']), int(box['height']))
    b.close()
