"""用模擬器的 Blockly 把程式積木輸出成 PNG（取代 MakeCode 截圖）。"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROGS = {
 'blocks-sq-full': "X.x(X.start(X.init(X.pause(1000,'<block type=\"f1_repeat\"><value name=\"TIMES\">'+X.n(4)+'</value><statement name=\"DO\">'+X.motor('A','1',50,X.pause(5000,X.stop('A',X.pause(500,X.motor('L','1',50,X.motor('R','-1',50,X.pause(1000,X.stop('A',X.pause(500)))))))))+'</statement></block>'))))",
 'blocks-sq-straight': "X.x(X.motor('A','1',50,X.pause(5000,X.stop('A',X.pause(500)))))",
 'blocks-sq-turn': "X.x(X.motor('L','1',50,X.motor('R','-1',50,X.pause(1000,X.stop('A',X.pause(500))))))",
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
    pg = b.new_page(viewport={'width': 1500, 'height': 1400}, device_scale_factor=2)
    pg.goto('file://' + ROOT + '/sim/index.html?m=free'); pg.wait_for_function('window.F1SimApp && F1SimApp.ws')
    for name, js in PROGS.items():
        xml = pg.evaluate('(function(){var X=F1Xml; return ' + js + ';})()')
        pg.evaluate('x => { F1SimApp.load(x); F1SimApp.ws.setScale(1); F1SimApp.ws.scroll(0,0); }', xml)
        pg.wait_for_timeout(300)
        box = pg.evaluate("""() => { const c = document.querySelector('.blocklyBlockCanvas').getBoundingClientRect(); return {x:c.x-10,y:c.y-10,width:c.width+20,height:c.height+20}; }""")
        pg.screenshot(path=os.path.join(ROOT, 'assets', 'img', name + '.png'), clip=box)
        print(name, int(box['width']), int(box['height']))
    b.close()
