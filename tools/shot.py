import sys, os
from playwright.sync_api import sync_playwright
R='/home/claude/f1-dt'; OUT='/tmp/claude-0/-home-claude/5be7f1f4-bc47-523c-8ed9-8064bc377622/scratchpad/'
page=sys.argv[1]; w=int(sys.argv[2]) if len(sys.argv)>2 else 1366
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file://'+R+'/'+page); pg.wait_for_timeout(1200)
    print('errors:', errs)
    h=pg.evaluate('document.body.scrollHeight'); print('height', h)
    name=page.replace('/','_').replace('.html','')+f'_{w}'
    pg.screenshot(path=OUT+name+'.png', full_page=True)
    b.close()
from PIL import Image
im=Image.open(OUT+name+'.png'); W,H=im.size
n=0
for i in range(0,H,2400):
    im.crop((0,i,W,min(H,i+2400))).save(OUT+f'{name}_{n}.png'); n+=1
print(n,'parts', name)
