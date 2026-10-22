"""把課堂頁打包成「單一 HTML 檔」（CSS、JS、圖片全部內嵌），方便放上 Google Drive 或離線使用。
執行：python3 tools/build_single.py [輸出資料夾]
預設輸出到 dist/single/。"""
import os, re, sys, base64, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'single')
LESSONS = [('L1', '第1堂_認識機械人'), ('L2', '第2堂_小車走正方形'), ('L3', '第3堂_巡線機械人'), ('L4', '第4堂_流程圖與巡線優化')]
MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}
IMG_DIR = os.path.join(ROOT, 'assets', 'img')


def data_uri(name):
    p = os.path.join(IMG_DIR, name)
    return 'data:' + MIME[os.path.splitext(name)[1].lower()] + ';base64,' + base64.b64encode(open(p, 'rb').read()).decode()


def build(lid, outname):
    src_dir = os.path.join(ROOT, lid)
    html = open(os.path.join(src_dir, 'index.html'), encoding='utf-8').read()

    # 1. CSS
    def css(m):
        path = os.path.normpath(os.path.join(src_dir, m.group(1)))
        return '<style>\n' + open(path, encoding='utf-8').read() + '\n</style>'
    html = re.sub(r'<link rel="stylesheet" href="(\.\./[^"]+\.css)">', css, html)

    # 2. JS
    def js(m):
        path = os.path.normpath(os.path.join(src_dir, m.group(1)))
        code = open(path, encoding='utf-8').read().replace('</script', '<\\/script')
        return '<script>\n' + code + '\n</script>'
    html = re.sub(r'<script src="(\.\./[^"]+\.js)"></script>', js, html)

    # 3. 圖片：HTML 屬性直接換成 data URI；JS 內動態組成的路徑用對照表處理
    found = set(re.findall(r'([\w\-]+\.(?:svg|png|jpe?g))', html))
    for pre in re.findall(r"'([a-z]+-)' \+ f \+ '\.svg'", html):        # 例：part('motor') → part-motor.svg
        found |= set(n for n in os.listdir(IMG_DIR) if n.startswith(pre))
    names = sorted(n for n in found if os.path.exists(os.path.join(IMG_DIR, n)))
    for n in names:
        html = html.replace('"../assets/img/' + n + '"', '"' + data_uri(n) + '"')
    table = {('../assets/img/' + n): data_uri(n) for n in names}
    shim = ('<script>(function(){var M=' + json.dumps(table) + ';' +
            'function fix(el){if(el.tagName==="IMG"){var s=el.getAttribute("src");if(s&&M[s])el.setAttribute("src",M[s]);}}' +
            'function scan(n){if(n.nodeType!==1)return;fix(n);if(n.querySelectorAll)Array.prototype.forEach.call(n.querySelectorAll("img"),fix);}' +
            'new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==="attributes")fix(m.target);else Array.prototype.forEach.call(m.addedNodes,scan);});})' +
            '.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});})();</script>')
    html = html.replace('<head>', '<head>\n' + shim, 1)
    html = html.replace('<meta name="viewport"', '<!-- 單一檔案版本：由 tools/build_single.py 產生，原始檔在 GitHub EdwardYungCH/F1-DT -->\n<meta name="viewport"', 1)

    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, outname + '.html')
    open(out, 'w', encoding='utf-8').write(html)
    left = re.findall(r'(?:src|href)="\.\./[^"]+"', html)
    print(f'{out}  {len(html) // 1024} KB  圖片 {len(names)}  未內嵌的相對連結 {left}')


if __name__ == '__main__':
    for lid, name in LESSONS:
        build(lid, name)
