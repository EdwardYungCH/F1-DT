#!/usr/bin/env python3
"""產生單元的靜態插圖（SVG）。執行：python3 tools/gen_art.py"""
import os, math
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'img')
os.makedirs(OUT, exist_ok=True)

INK = "#2b3d52"; MUTED = "#5f6f82"; BLUE = "#1e6fd9"; GREEN = "#1f9d55"; RED = "#d63a3a"
ORANGE = "#e08600"; GREY = "#9aa7b5"; PAPER = "#f6f8fb"; PCB = "#2e8b57"
FONT = 'font-family="Noto Sans TC,PingFang HK,Microsoft JhengHei,sans-serif"'

def svg(w, h, body, label=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">'
            f'<title>{label}</title>{body}</svg>')
def t(x, y, s, size=13, fill=INK, anchor="middle", weight=700, extra=""):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}" {FONT} {extra}>{s}</text>'
def defs(p, extra=''):
    out = '<defs>'
    for n, c in [("g", GREEN), ("r", RED), ("k", INK), ("b", BLUE), ("o", ORANGE), ("m", MUTED)]:
        out += (f'<marker id="{p}{n}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
                f'<path d="M0 0 L10 5 L0 10 z" fill="{c}"/></marker>')
    return out + extra + '</defs>'
def save(name, content):
    open(os.path.join(OUT, name), 'w').write(content)

# ------------------------------------------------------------------ 場景背景
def room(W=320, H=200, wall="#e3eaf2", floor="#e9dccb", line_y=128, boards=True):
    s = f'<rect width="{W}" height="{H}" fill="{wall}"/>'
    s += f'<rect y="{line_y-6}" width="{W}" height="6" fill="#cbd6e2"/>'
    s += f'<rect y="{line_y}" width="{W}" height="{H-line_y}" fill="{floor}"/>'
    if boards:
        for i in range(-40, W + 60, 64):
            s += f'<line x1="{i}" y1="{line_y}" x2="{i-40}" y2="{H}" stroke="#dccbb5" stroke-width="2"/>'
    return s
def shadow(cx, cy, rx, ry=None, op=.14):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry or rx*0.22}" fill="#000" opacity="{op}"/>'

# ------------------------------------------------------------------ 第 1 堂：物品卡 q1–q9
def q1_arm():
    s = room(floor="#d9dee5", boards=False)
    # 輸送帶
    s += '<rect x="170" y="140" width="150" height="16" rx="8" fill="#5b6b7d"/>'
    for x in range(178, 320, 18): s += f'<circle cx="{x}" cy="148" r="5" fill="#8b9aa8"/>'
    s += '<rect x="230" y="114" width="38" height="26" rx="3" fill="#c79a5b" stroke="#9c7440" stroke-width="2"/><path d="M230 122 h38" stroke="#9c7440" stroke-width="2"/>'
    # 底座
    s += shadow(110, 176, 46, 9)
    s += '<rect x="78" y="150" width="64" height="24" rx="6" fill="#f2a033" stroke="#c77a12" stroke-width="2"/>'
    s += '<rect x="96" y="132" width="28" height="22" rx="5" fill="#f2a033" stroke="#c77a12" stroke-width="2"/>'
    # 手臂
    s += '<path d="M110 140 L150 72" stroke="#f2a033" stroke-width="20" stroke-linecap="round"/><path d="M110 140 L150 72" stroke="#c77a12" stroke-width="20" stroke-linecap="round" stroke-opacity=".25"/>'
    s += '<circle cx="110" cy="140" r="12" fill="#3b4a5a"/><circle cx="110" cy="140" r="5" fill="#8b9aa8"/>'
    s += '<path d="M150 72 L222 92" stroke="#f2a033" stroke-width="16" stroke-linecap="round"/>'
    s += '<circle cx="150" cy="72" r="11" fill="#3b4a5a"/><circle cx="150" cy="72" r="4" fill="#8b9aa8"/>'
    # 手腕 + 夾
    s += '<circle cx="222" cy="92" r="8" fill="#3b4a5a"/>'
    s += '<rect x="236" y="88" width="12" height="16" rx="2" fill="#5b6b7d" transform="rotate(16 242 96)"/>'
    s += '<path d="M244 104 l2 12 M252 100 l6 10" stroke="#3b4a5a" stroke-width="4" stroke-linecap="round"/>'
    # 感應器眼
    s += '<circle cx="232" cy="84" r="3" fill="#2fd27a"/>'
    return svg(320, 200, s, '工業機械手臂')

def q2_delivery():
    s = room(wall="#f3e9dd", floor="#d8c3a5")
    s += '<rect x="20" y="60" width="70" height="8" rx="2" fill="#b98f62"/><rect x="28" y="68" width="6" height="58" fill="#a07a50"/><rect x="76" y="68" width="6" height="58" fill="#a07a50"/>'
    s += shadow(190, 186, 46, 8)
    s += '<rect x="150" y="40" width="80" height="140" rx="20" fill="#fbfcfd" stroke="' + INK + '" stroke-width="2.5"/>'
    s += '<rect x="162" y="50" width="56" height="34" rx="10" fill="#1f2a36"/><circle cx="180" cy="66" r="5" fill="#5fd3ff"/><circle cx="200" cy="66" r="5" fill="#5fd3ff"/><path d="M182 76 q8 5 16 0" stroke="#5fd3ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    for y in (100, 132):
        s += f'<rect x="154" y="{y}" width="72" height="6" rx="3" fill="#d2dae3"/>'
    s += '<path d="M166 100 q12 -14 24 0 z" fill="#f4f4f4" stroke="#c9d1da"/><path d="M196 132 q12 -14 24 0 z" fill="#f4f4f4" stroke="#c9d1da"/><path d="M164 132 q10 -10 20 0 z" fill="#f6c46b"/>'
    s += '<rect x="160" y="168" width="60" height="10" rx="5" fill="#3b4a5a"/><circle cx="168" cy="181" r="5" fill="#26323e"/><circle cx="212" cy="181" r="5" fill="#26323e"/>'
    s += '<rect x="176" y="150" width="28" height="8" rx="4" fill="#1e6fd9" opacity=".9"/>'
    for r in (14, 24):
        s += f'<path d="M{238} {156-r*0.4} q{r*0.5} {r*0.4} 0 {r*0.8}" fill="none" stroke="{BLUE}" stroke-width="2" opacity="{1-r/40:.2f}"/>'
    return svg(320, 200, s, '送餐機械人')

def q3_vacuum():
    W, H = 320, 200
    s = room()
    s += '<path d="M40 175 Q120 150 175 140" fill="none" stroke="#f5ede2" stroke-width="44" stroke-linecap="round"/>'
    for (x, y) in [(230, 170), (250, 150), (270, 182), (215, 188), (290, 160)]:
        s += f'<circle cx="{x}" cy="{y}" r="2.6" fill="#9a8466"/>'
    s += '<ellipse cx="180" cy="152" rx="70" ry="20" fill="#000" opacity=".12"/>'
    s += '<path d="M110 132 v10 a70 24 0 0 0 140 0 v-10" fill="#3b4a5a"/>'
    s += f'<ellipse cx="180" cy="132" rx="70" ry="24" fill="#f9fbfd" stroke="{INK}" stroke-width="2"/>'
    s += '<path d="M116 140 a70 24 0 0 0 128 0" fill="none" stroke="#1e6fd9" stroke-width="5" stroke-linecap="round"/>'
    s += '<ellipse cx="180" cy="126" rx="14" ry="6" fill="#dfe8f3" stroke="#9fb3c8" stroke-width="1.5"/><circle cx="212" cy="128" r="3" fill="#1f9d55"/>'
    s += '<g transform="translate(122 156)">' + ''.join(f'<line x1="0" y1="0" x2="{16*math.cos(math.radians(a)):.1f}" y2="{6*math.sin(math.radians(a)):.1f}" stroke="#6b7a8c" stroke-width="1.6"/>' for a in range(0, 360, 45)) + '</g>'
    for r in (16, 26, 36):
        s += f'<path d="M{180-r*0.8:.1f} {108-r*0.35:.1f} q{r*0.8:.1f} {-r*0.6:.1f} {r*1.6:.1f} 0" fill="none" stroke="#1e6fd9" stroke-width="2" opacity="{1-r/50:.2f}"/>'
    return svg(W, H, s, '自動掃地機械人')

def q4_lift():
    s = '<rect width="320" height="200" fill="#e7ecf2"/><rect y="176" width="320" height="24" fill="#cfd6de"/>'
    s += '<rect x="86" y="22" width="148" height="154" rx="4" fill="#b9c4cf"/>'
    s += '<rect x="96" y="44" width="128" height="132" fill="#26323e"/>'
    s += '<rect x="96" y="44" width="50" height="132" fill="#c7d0d9" stroke="#9aa7b5"/><rect x="174" y="44" width="50" height="132" fill="#c7d0d9" stroke="#9aa7b5"/>'
    s += '<rect x="146" y="44" width="28" height="132" fill="#fff4cc" opacity=".55"/>'
    s += '<rect x="132" y="26" width="56" height="14" rx="3" fill="#1b1b1b"/>' + t(160, 37, '▲ 5', 11, '#ff7a45')
    s += '<rect x="246" y="86" width="26" height="54" rx="5" fill="#d4dbe3" stroke="#9aa7b5"/>'
    s += '<circle cx="259" cy="102" r="7" fill="#fff" stroke="#9aa7b5"/><path d="M255 104 l4 -5 l4 5" stroke="#ff7a45" stroke-width="2" fill="none"/>'
    s += '<circle cx="259" cy="124" r="7" fill="#fff" stroke="#9aa7b5"/><path d="M255 122 l4 5 l4 -5" stroke="' + MUTED + '" stroke-width="2" fill="none"/>'
    # 門邊紅外線
    s += '<line x1="146" y1="120" x2="174" y2="120" stroke="#ff3b30" stroke-width="2" stroke-dasharray="3 3"/><line x1="146" y1="140" x2="174" y2="140" stroke="#ff3b30" stroke-width="2" stroke-dasharray="3 3"/>'
    return svg(320, 200, s, '升降機')

def q5_door():
    s = '<rect width="320" height="200" fill="#e9eef3"/><rect y="170" width="320" height="30" fill="#c9d1d9"/>'
    s += '<rect x="60" y="24" width="200" height="148" fill="#7d8b99"/>'
    s += '<rect x="68" y="44" width="184" height="128" fill="#dfeaf3"/>'
    s += '<rect x="68" y="44" width="70" height="128" fill="#b8d6ec" opacity=".85" stroke="#7aa6c6" stroke-width="2"/>'
    s += '<rect x="182" y="44" width="70" height="128" fill="#b8d6ec" opacity=".85" stroke="#7aa6c6" stroke-width="2"/>'
    s += '<path d="M128 108 l-18 0 M110 108 l6 -6 M110 108 l6 6" stroke="#2b3d52" stroke-width="3" fill="none" stroke-linecap="round"/>'
    s += '<path d="M192 108 l18 0 M210 108 l-6 -6 M210 108 l-6 6" stroke="#2b3d52" stroke-width="3" fill="none" stroke-linecap="round"/>'
    s += '<rect x="146" y="28" width="28" height="12" rx="3" fill="#26323e"/><circle cx="160" cy="34" r="3" fill="#ff3b30"/>'
    s += '<path d="M160 40 L120 168 L200 168 Z" fill="#ff3b30" opacity=".1"/>'
    # 人
    s += '<g transform="translate(160 118)"><circle cx="0" cy="-8" r="10" fill="#f0b98f"/><rect x="-12" y="4" width="24" height="34" rx="10" fill="#3f7bd8"/><rect x="-10" y="36" width="8" height="16" fill="#2b3d52"/><rect x="2" y="36" width="8" height="16" fill="#2b3d52"/></g>'
    return svg(320, 200, s, '自動門')

def q6_rc():
    s = room(wall="#eef1f5", floor="#d7dde4", boards=False)
    s += shadow(116, 170, 52, 9)
    s += '<rect x="66" y="130" width="100" height="30" rx="12" fill="#e2453a"/><path d="M84 130 q12 -22 40 -22 q22 0 30 22 z" fill="#e2453a"/><path d="M96 128 q10 -14 26 -14 q16 0 22 14 z" fill="#bfe3f7"/>'
    for x in (88, 148): s += f'<circle cx="{x}" cy="162" r="13" fill="#26323e"/><circle cx="{x}" cy="162" r="5" fill="#9aa7b5"/>'
    # 遙控器 + 手
    s += '<rect x="214" y="80" width="64" height="44" rx="12" fill="#3b4a5a"/><line x1="268" y1="80" x2="284" y2="40" stroke="#3b4a5a" stroke-width="3"/><circle cx="284" cy="40" r="3" fill="#ff3b30"/>'
    s += '<circle cx="232" cy="102" r="9" fill="#5b6b7d"/><circle cx="232" cy="102" r="4" fill="#cfd6de"/><circle cx="260" cy="102" r="9" fill="#5b6b7d"/><circle cx="260" cy="102" r="4" fill="#cfd6de"/>'
    s += '<path d="M206 124 q-6 14 6 22 h22 q8 -6 4 -22 z" fill="#f0b98f"/>'
    for r in (14, 24, 34):
        s += f'<path d="M{200-r} {70+r*0.3} q-{r*0.3} {r*0.4} 0 {r*0.8}" fill="none" stroke="{MUTED}" stroke-width="2" opacity="{1-r/45:.2f}"/>'
    return svg(320, 200, s, '手動遙控車')

def q7_fan():
    s = room(wall="#eef3f7", floor="#e6dccd")
    s += shadow(160, 182, 40, 7)
    s += '<rect x="126" y="170" width="68" height="12" rx="6" fill="#d7dee6" stroke="#9aa7b5"/>'
    s += '<rect x="154" y="112" width="12" height="60" rx="5" fill="#d7dee6" stroke="#9aa7b5"/>'
    s += '<circle cx="160" cy="80" r="56" fill="#f7fafc" stroke="#9aa7b5" stroke-width="2"/>'
    for a in range(0, 360, 120):
        s += f'<path d="M160 80 q{40*math.cos(math.radians(a)):.0f} {40*math.sin(math.radians(a)):.0f} {46*math.cos(math.radians(a+40)):.0f} {46*math.sin(math.radians(a+40)):.0f} q-{10*math.cos(math.radians(a)):.0f} -{4*math.sin(math.radians(a)):.0f} -{46*math.cos(math.radians(a+40)):.0f} -{46*math.sin(math.radians(a+40)):.0f}" fill="#9cc6ea" opacity=".9"/>'
    for r in range(18, 57, 9):
        s += f'<circle cx="160" cy="80" r="{r}" fill="none" stroke="#c5d0dc" stroke-width="1"/>'
    s += '<circle cx="160" cy="80" r="9" fill="#5b6b7d"/>'
    s += '<rect x="134" y="174" width="12" height="5" rx="2" fill="#5b6b7d"/><rect x="150" y="174" width="12" height="5" rx="2" fill="#8b9aa8"/>'
    return svg(320, 200, s, '風扇')

def q8_claw():
    s = '<rect width="320" height="200" fill="#2b2240"/>'
    for i in range(12): s += f'<circle cx="{(i*53)%320}" cy="{(i*37)%60+10}" r="2" fill="#ffd166" opacity=".6"/>'
    s += '<rect x="90" y="16" width="140" height="176" rx="10" fill="#ff5c8a"/>'
    s += '<rect x="102" y="30" width="116" height="96" rx="4" fill="#dff3ff" opacity=".9"/>'
    s += '<line x1="102" y1="40" x2="218" y2="40" stroke="#9aa7b5" stroke-width="3"/>'
    s += '<line x1="168" y1="40" x2="168" y2="66" stroke="#5b6b7d" stroke-width="2"/><rect x="160" y="64" width="16" height="8" rx="2" fill="#5b6b7d"/>'
    s += '<path d="M162 72 l-6 12 M174 72 l6 12 M168 72 v13" stroke="#5b6b7d" stroke-width="3" stroke-linecap="round"/>'
    for (x, c) in [(118, '#ffd166'), (140, '#7bd389'), (190, '#8fb8ff'), (206, '#ffb38a')]:
        s += f'<circle cx="{x}" cy="114" r="11" fill="{c}"/><circle cx="{x-4}" cy="111" r="1.6" fill="#2b2240"/><circle cx="{x+4}" cy="111" r="1.6" fill="#2b2240"/>'
    s += '<rect x="102" y="134" width="116" height="40" rx="6" fill="#ff86a8"/>'
    s += '<line x1="134" y1="156" x2="128" y2="140" stroke="#26323e" stroke-width="4" stroke-linecap="round"/><circle cx="128" cy="140" r="6" fill="#e2453a"/>'
    s += '<circle cx="186" cy="152" r="9" fill="#ffd166"/><circle cx="206" cy="152" r="7" fill="#7bd389"/>'
    return svg(320, 200, s, '夾公仔機')

def q9_ornament():
    s = '<rect width="320" height="200" fill="#efe9f6"/><rect y="150" width="320" height="50" fill="#d9cfe6"/>'
    # 展示座
    s += '<rect x="112" y="150" width="96" height="16" rx="3" fill="#3b4a5a"/><rect x="104" y="164" width="112" height="10" rx="3" fill="#26323e"/>'
    s += '<rect x="132" y="154" width="56" height="8" rx="2" fill="#c7a34f"/>' + t(160, 161, '擺設', 7, '#26323e')
    # 原創造型機械人（方頭、天線）
    s += '<rect x="138" y="92" width="44" height="52" rx="8" fill="#9aa9bd" stroke="#5f6f82" stroke-width="2"/>'
    s += '<rect x="148" y="104" width="24" height="14" rx="3" fill="#c9d4e2"/><circle cx="154" cy="126" r="3" fill="#e2453a"/><circle cx="166" cy="126" r="3" fill="#ffd166"/>'
    s += '<rect x="124" y="96" width="14" height="36" rx="6" fill="#9aa9bd" stroke="#5f6f82" stroke-width="2"/><rect x="182" y="96" width="14" height="36" rx="6" fill="#9aa9bd" stroke="#5f6f82" stroke-width="2"/>'
    s += '<rect x="144" y="142" width="12" height="10" fill="#5f6f82"/><rect x="164" y="142" width="12" height="10" fill="#5f6f82"/>'
    s += '<rect x="140" y="52" width="40" height="38" rx="8" fill="#b6c3d4" stroke="#5f6f82" stroke-width="2"/>'
    s += '<circle cx="152" cy="70" r="5" fill="#26323e"/><circle cx="168" cy="70" r="5" fill="#26323e"/><rect x="152" y="80" width="16" height="3" rx="1.5" fill="#5f6f82"/>'
    s += '<line x1="160" y1="52" x2="160" y2="40" stroke="#5f6f82" stroke-width="2"/><circle cx="160" cy="38" r="4" fill="#e2453a"/>'
    return svg(320, 200, s, '機械人造型擺設')

# ------------------------------------------------------------------ 第 1 堂：部件圖鑑
def part(body, label, W=200, H=130):
    return svg(W, H, f'<rect width="{W}" height="{H}" rx="12" fill="{PAPER}"/>' + body, label)
PARTS = {
 'part-ultrasonic': ('超聲波感應器', '<rect x="30" y="38" width="120" height="60" rx="8" fill="#2f6db3"/><circle cx="64" cy="68" r="21" fill="#e8eff7" stroke="#1d4c7c" stroke-width="4"/><circle cx="116" cy="68" r="21" fill="#e8eff7" stroke="#1d4c7c" stroke-width="4"/><circle cx="64" cy="68" r="8" fill="#93a9c2"/><circle cx="116" cy="68" r="8" fill="#93a9c2"/>' + ''.join(f'<path d="M{150+r*0.3} {68-r} a{r} {r} 0 0 1 0 {2*r}" fill="none" stroke="#f0a500" stroke-width="3" opacity="{1-r/50:.2f}"/>' for r in (14, 24, 34)) + ''.join(f'<rect x="{x}" y="98" width="6" height="16" fill="#d9a021"/>' for x in (66, 82, 98, 114))),
 'part-line': ('巡線感應器', '<rect y="96" width="200" height="34" fill="#fff" stroke="#dde3ea"/><rect x="70" y="96" width="44" height="34" fill="#1d1f22"/><rect x="40" y="20" width="120" height="34" rx="6" fill="' + PCB + '"/><circle cx="76" cy="37" r="9" fill="#fff" stroke="#1c5c39" stroke-width="2"/><circle cx="124" cy="37" r="9" fill="#1b1b1b" stroke="#1c5c39" stroke-width="2"/><line x1="78" y1="48" x2="90" y2="94" stroke="#ff3b30" stroke-width="4" stroke-dasharray="5 4"/><line x1="98" y1="94" x2="120" y2="50" stroke="#ff3b30" stroke-width="2" stroke-dasharray="3 5" opacity=".6"/>'),
 'part-buttons': ('按鈕 A、B', '<rect x="20" y="30" width="160" height="72" rx="12" fill="#d8dee6" stroke="#9aa7b5" stroke-width="2"/>' + ''.join(f'<circle cx="{x}" cy="66" r="22" fill="#f7f8fa" stroke="#8a97a5" stroke-width="3"/><circle cx="{x}" cy="66" r="13" fill="#2b3a4a"/>' + t(x, 71, l, 14, '#fff') for x, l in ((66, 'A'), (134, 'B')))),
 'part-camera': ('攝影機', '<rect x="34" y="36" width="104" height="66" rx="12" fill="#37474f"/><rect x="70" y="26" width="34" height="14" rx="4" fill="#546e7a"/><circle cx="86" cy="69" r="24" fill="#90a4ae"/><circle cx="86" cy="69" r="15" fill="#1a237e"/><circle cx="80" cy="63" r="5" fill="#fff" opacity=".85"/><path d="M138 54l32-14v58l-32-14z" fill="#546e7a"/>'),
 'part-microbit': ('micro:bit 微控制器', '<rect x="40" y="22" width="120" height="90" rx="10" fill="#1f2a36"/><rect x="40" y="96" width="120" height="16" fill="#c8a13a"/>' + ''.join(f'<rect x="{46+i*14}" y="98" width="8" height="12" fill="#1f2a36"/>' for i in range(8)) + ''.join(f'<rect x="{72+c*12}" y="{36+r*10}" width="6" height="6" rx="1" fill="{"#ff4d3d" if (r+c)%2==0 else "#3a2523"}"/>' for r in range(5) for c in range(5)) + '<circle cx="56" cy="58" r="7" fill="#3b4a5a"/><circle cx="144" cy="58" r="7" fill="#3b4a5a"/>' + t(56, 84, 'A', 10, '#cfd6de') + t(144, 84, 'B', 10, '#cfd6de')),
 'part-program': ('程式（積木）', '<rect x="26" y="20" width="148" height="92" rx="10" fill="#fff" stroke="#c3cedb" stroke-width="2"/><rect x="38" y="30" width="96" height="18" rx="5" fill="#1E90FF"/><rect x="50" y="52" width="110" height="18" rx="5" fill="#0FBC11"/><rect x="50" y="74" width="80" height="18" rx="5" fill="#00A4A6"/><rect x="38" y="96" width="60" height="8" rx="4" fill="#1E90FF"/>'),
 'part-motor': ('馬達 + 車輪', '<rect x="22" y="44" width="60" height="42" rx="8" fill="#78909c"/><rect x="82" y="58" width="22" height="14" fill="#b0bec5"/><circle cx="136" cy="65" r="38" fill="#2f3640"/><circle cx="136" cy="65" r="18" fill="#9aa5ac"/>' + ''.join(f'<line x1="136" y1="65" x2="{136+16*math.cos(math.radians(a)):.0f}" y2="{65+16*math.sin(math.radians(a)):.0f}" stroke="#5b6670" stroke-width="3"/>' for a in range(0, 360, 60)) + '<path d="M136 18 a47 47 0 0 1 44 30" fill="none" stroke="#1f9d55" stroke-width="3" marker-end="url(#pmg)"/>'),
 'part-led': ('LED 顯示屏', '<rect x="50" y="18" width="100" height="96" rx="10" fill="#1b1b1b"/>' + ''.join(f'<circle cx="{70+c*15}" cy="{38+r*15}" r="5" fill="#ff4d3d" opacity="{1 if [r,c] in [[0,1],[0,3],[2,0],[2,4],[3,1],[3,2],[3,3]] else 0.18}"/>' for r in range(5) for c in range(5))),
 'part-buzzer': ('蜂鳴器', '<circle cx="78" cy="64" r="36" fill="#212121"/><circle cx="78" cy="64" r="10" fill="#616161"/><rect x="64" y="98" width="6" height="18" fill="#424242"/><rect x="86" y="98" width="6" height="18" fill="#424242"/>' + ''.join(f'<path d="M{122+r*0.4} {64-r} a{r} {r} 0 0 1 0 {2*r}" fill="none" stroke="#f0a500" stroke-width="3" opacity="{1-r/50:.2f}"/>' for r in (14, 24, 34))),
 'part-servo': ('伺服馬達', '<rect x="44" y="44" width="92" height="58" rx="6" fill="#2b6cb0"/><rect x="26" y="58" width="18" height="18" fill="#4a5568"/><rect x="136" y="58" width="18" height="18" fill="#4a5568"/><circle cx="90" cy="44" r="16" fill="#90cdf4" stroke="#1a4e8a" stroke-width="2"/><rect x="88" y="14" width="60" height="12" rx="6" fill="#e2e8f0" stroke="#a0aec0" transform="rotate(-25 90 40)"/><circle cx="90" cy="44" r="4" fill="#1a4e8a"/><path d="M128 18 a40 40 0 0 1 20 26" fill="none" stroke="#1f9d55" stroke-width="3" marker-end="url(#pmg)"/>' + t(150, 122, '轉到指定角度', 11, MUTED, 'middle', 600)),
}

# ------------------------------------------------------------------ 輸入 → 處理 → 輸出（有回饋箭頭）
def ipo():
    W, H = 760, 250
    s = defs('ip') + f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    boxes = [(30, '#e8f4ff', '#1e6fd9', '輸入 Input', '感應器（Sensor）', '收集環境資料'),
             (280, '#fff1e0', '#e08600', '處理 Process', '控制器＋程式', '依程式作決定'),
             (530, '#e9f8ee', '#1f9d55', '輸出 Output', '驅動器（Actuator）', '做出動作')]
    for (x, bg, st, a, b, c) in boxes:
        s += f'<rect x="{x}" y="40" width="200" height="120" rx="18" fill="{bg}" stroke="{st}" stroke-width="3"/>'
        s += t(x + 100, 82, a, 20, st, weight=800) + t(x + 100, 112, b, 15, INK) + t(x + 100, 136, c, 13, MUTED, weight=500)
    s += f'<line x1="234" y1="100" x2="272" y2="100" stroke="{INK}" stroke-width="4" marker-end="url(#ipk)"/>'
    s += f'<line x1="484" y1="100" x2="522" y2="100" stroke="{INK}" stroke-width="4" marker-end="url(#ipk)"/>'
    s += f'<path d="M630 164 V206 H130 V170" fill="none" stroke="{MUTED}" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#ipm)"/>'
    s += t(380, 228, '動作改變了環境 → 感應器再讀一次（不停重複）', 14, MUTED, weight=600)
    return svg(W, H, s, '輸入、處理、輸出')

# ------------------------------------------------------------------ 感知 → 決定 → 動作
def sda_loop():
    W, H = 640, 360
    p = 'sd'
    s = defs(p) + f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    nodes = [(320, 70, "感知", "Sense", "#e8f4ff", "#1e6fd9", "碰撞感應器：前面有牆！"),
             (520, 270, "決定", "Decide", "#fff1e0", "#e08600", "程式：如果碰到牆 → 轉彎"),
             (120, 270, "動作", "Act", "#e9f8ee", "#1f9d55", "馬達：右輪後退、左輪前進")]
    s += f'<path d="M414 96 Q520 120 528 224" fill="none" stroke="{INK}" stroke-width="3" marker-end="url(#{p}k)"/>'
    s += f'<path d="M436 304 Q320 344 218 306" fill="none" stroke="{INK}" stroke-width="3" marker-end="url(#{p}k)"/>'
    s += f'<path d="M112 228 Q120 120 222 84" fill="none" stroke="{INK}" stroke-width="3" marker-end="url(#{p}k)"/>'
    for (x, y, zh, en, bg, st, ex) in nodes:
        s += f'<rect x="{x-92}" y="{y-40}" width="184" height="80" rx="18" fill="{bg}" stroke="{st}" stroke-width="2.5"/>'
        s += t(x, y - 8, zh + "  " + en, 18, st, weight=800)
        s += t(x, y + 20, ex, 12.5, INK, weight=500)
    s += f'<rect x="250" y="160" width="140" height="12" rx="3" fill="#b8c4d1"/>' + t(320, 155, "牆", 11, MUTED)
    s += f'<g transform="translate(320 215)"><circle r="30" fill="#ffffff" stroke="{INK}" stroke-width="2.5"/><path d="M-26 -14 A30 30 0 0 1 26 -14" fill="none" stroke="#1e6fd9" stroke-width="6" stroke-linecap="round"/><circle r="8" fill="#dfe8f3" stroke="#9fb3c8" stroke-width="1.5"/></g>'
    s += f'<path d="M352 230 q22 4 26 -18" fill="none" stroke="{GREEN}" stroke-width="2.5" stroke-dasharray="4 4" marker-end="url(#{p}g)"/>'
    s += t(320, 345, "不停重複：感知 → 決定 → 動作", 13, MUTED, weight=600)
    return svg(W, H, s, '機械人的感知、決定、動作循環')

# ------------------------------------------------------------------ 紅外線反射原理
def ir_principle():
    W, H = 640, 300
    p = 'ir'
    s = defs(p, f'<linearGradient id="{p}beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3b30" stop-opacity=".9"/><stop offset="1" stop-color="#ff3b30" stop-opacity=".5"/></linearGradient>')
    for (ox, white) in [(0, True), (330, False)]:
        g = f'<g transform="translate({ox} 0)"><rect x="10" y="10" width="300" height="280" rx="16" fill="{PAPER}"/>'
        g += t(160, 40, "白色地面" if white else "黑色線", 17, INK, weight=800)
        g += f'<rect x="70" y="58" width="180" height="46" rx="10" fill="{PCB}"/>'
        g += '<rect x="96" y="96" width="34" height="18" rx="4" fill="#3b4a5a"/><circle cx="113" cy="114" r="9" fill="#d9e2ec" stroke="#3b4a5a" stroke-width="2"/>'
        g += '<rect x="190" y="96" width="34" height="18" rx="4" fill="#3b4a5a"/><circle cx="207" cy="114" r="9" fill="#1b1b1b" stroke="#3b4a5a" stroke-width="2"/>'
        g += t(113, 82, "發射器", 12, "#eafaf0") + t(207, 82, "接收器", 12, "#eafaf0")
        g += f'<circle cx="160" cy="70" r="6" fill="{"#5d6b7a" if white else "#ff3b30"}" stroke="#fff" stroke-width="1.5"/>'
        if not white: g += '<circle cx="160" cy="70" r="11" fill="#ff3b30" opacity=".3"/>'
        g += f'<rect x="30" y="228" width="260" height="36" rx="4" fill="{"#ffffff" if white else "#1d1f22"}" stroke="#c5d0dc"/>'
        g += f'<line x1="116" y1="126" x2="150" y2="224" stroke="url(#{p}beam)" stroke-width="7" stroke-linecap="round"/>'
        g += t(70, 180, "紅外線", 12, RED, "start")
        if white:
            g += f'<line x1="166" y1="224" x2="202" y2="130" stroke="#ff3b30" stroke-width="7" stroke-linecap="round" marker-end="url(#{p}r)"/>'
            g += t(160, 286, "反射多 → 收到強訊號 → 讀數 0", 13.5, INK) + t(250, 180, "反射強", 12, RED, "start")
        else:
            g += '<line x1="166" y1="224" x2="194" y2="150" stroke="#ff3b30" stroke-width="2.5" stroke-dasharray="3 5" opacity=".6"/>'
            for dx in (-22, 0, 22): g += f'<circle cx="{158+dx}" cy="244" r="3" fill="#ff3b30" opacity=".55"/>'
            g += t(160, 286, "被吸收 → 收不到 → 讀數 1", 13.5, INK) + t(232, 172, "反射弱", 12, MUTED, "start")
            g += t(160, 62, "", 1)
        s += g + '</g>'
    s += t(490, 56, "", 1)
    return svg(W, H, s, '巡線感應器的紅外線反射原理')

# ------------------------------------------------------------------ 第 2 堂：情況卡（側面圖）
def scene(o, label):
    W, H = 320, 190
    gy = 132; h = o.get('h', 30); sy = gy - h
    s = f'<rect width="{W}" height="{H}" fill="#f4f7fa"/>'
    if o.get('ground', '#ffffff') is not None:
        s += f'<rect x="0" y="{gy}" width="{W}" height="{H-gy}" fill="{o.get("ground", "#ffffff")}"/><line x1="0" y1="{gy}" x2="{W}" y2="{gy}" stroke="#c5d0dc"/>'
    s += o.get('patch', '')
    # 小車（側面）
    cx = o.get('cx', 150)
    s += f'<rect x="{cx-70}" y="{sy-36}" width="140" height="26" rx="10" fill="#f7f9fb" stroke="{INK}" stroke-width="2"/>'
    s += f'<circle cx="{cx+46}" cy="{sy-8}" r="16" fill="#26323e"/><circle cx="{cx+46}" cy="{sy-8}" r="6" fill="#9aa7b5"/>' if o.get('wheel', True) else ''
    s += f'<rect x="{cx-66}" y="{sy-10}" width="44" height="10" rx="3" fill="{PCB}"/>'
    ex, rx = cx - 56, cx - 34
    s += f'<line x1="{ex}" y1="{sy}" x2="{ex+8}" y2="{gy}" stroke="#ff3b30" stroke-width="3.5"/>'
    up = o.get('up')
    if up == 'strong': s += f'<line x1="{ex+12}" y1="{gy}" x2="{rx}" y2="{sy+1}" stroke="#ff3b30" stroke-width="3.5"/>'
    elif up == 'weak': s += f'<line x1="{ex+12}" y1="{gy}" x2="{rx}" y2="{sy+1}" stroke="#ff3b30" stroke-width="1.5" stroke-dasharray="3 4" opacity=".7"/>'
    s += o.get('extra', '')
    s += t(W - 12, 22, o.get('cap', ''), 12, MUTED, 'end', 600)
    return svg(W, H, s, label)
SURF = {
 'surf-white': ('白色地磚／白紙', dict(up='strong', cap='白色地面')),
 'surf-tape': ('啞光黑色電線膠帶', dict(up=None, cap='啞光黑膠帶', patch='<rect x="70" y="132" width="60" height="58" fill="#141414"/>')),
 'surf-carpet': ('深藍色地毯', dict(ground='#2b3f6b', up='weak', cap='深藍色', patch=''.join(f'<line x1="{x}" y1="134" x2="{x+4}" y2="190" stroke="#22345a" stroke-width="2"/>' for x in range(4, 320, 9)))),
 'surf-glossy': ('反光鏡面地板', dict(ground='#dfe9f3', up='strong', cap='反光地板', extra='<g stroke="#ffffff" stroke-width="4" opacity=".95"><path d="M190 150h40"/><path d="M240 170h50"/><path d="M20 162h30"/></g><line x1="102" y1="132" x2="150" y2="98" stroke="#ff3b30" stroke-width="2" stroke-dasharray="2 4" opacity=".7"/>')),
 'surf-high': ('感應器離地 5 cm（太高）', dict(h=74, up='weak', cap='離地太高', extra='<path d="M60 58v74" stroke="#5f6f82" stroke-width="1.5" stroke-dasharray="3 3"/><text x="64" y="100" font-size="12" fill="#5f6f82" font-weight="700" ' + FONT + '>5 cm</text>')),
 'surf-edge': ('車頭伸出桌邊（懸空）', dict(ground=None, up=None, cap='懸空', cx=110, patch='<rect x="80" y="132" width="240" height="58" fill="#c8a17a" stroke="#a3805c"/>', extra='<text x="60" y="172" font-size="12" fill="#d63a3a" font-weight="800" text-anchor="middle" ' + FONT + '>下面沒有東西</text>')),
 'surf-shiny': ('黑線上貼了透明反光膠紙', dict(up='strong', cap='反光膠紙', patch='<rect x="70" y="132" width="60" height="58" fill="#141414"/><rect x="66" y="128" width="68" height="8" rx="2" fill="#9fd8ff" opacity=".85"/>')),
 'surf-dust': ('探頭蓋滿灰塵／貼紙', dict(up=None, cap='探頭蒙塵', extra='<g fill="#a08a6a"><circle cx="94" cy="96" r="4"/><circle cx="104" cy="99" r="3"/><circle cx="116" cy="97" r="4"/><circle cx="126" cy="95" r="3"/><circle cx="86" cy="98" r="3"/></g>')),
 'surf-pencil': ('白紙上用鉛筆畫的淺灰線', dict(up='strong', cap='淺灰鉛筆線', patch='<rect x="80" y="132" width="44" height="58" fill="#c3c6ca"/>')),
}

# ------------------------------------------------------------------ 小車俯視示意圖（有標籤）
def car_top():
    W, H = 760, 360
    p = 'ct'
    s = defs(p) + f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    cx, cy = 380, 190
    s += f'<rect x="{cx-118}" y="{cy-58}" width="26" height="92" rx="9" fill="#26323e"/><rect x="{cx+92}" y="{cy-58}" width="26" height="92" rx="9" fill="#26323e"/>'
    s += f'<path d="M{cx-92} {cy+88} V{cy-110} Q{cx-92} {cy-150} {cx-50} {cy-150} H{cx+50} Q{cx+92} {cy-150} {cx+92} {cy-110} V{cy+88} Q{cx+92} {cy+110} {cx+70} {cy+110} H{cx-70} Q{cx-92} {cy+110} {cx-92} {cy+88} Z" fill="#fbfcfd" stroke="{INK}" stroke-width="3"/>'
    s += f'<rect x="{cx-50}" y="{cy-56}" width="100" height="80" rx="8" fill="#1f2a36"/>' + ''.join(f'<rect x="{cx-26+c*12}" y="{cy-40+r*11}" width="6" height="6" rx="1" fill="#3a2523"/>' for r in range(5) for c in range(5))
    s += f'<rect x="{cx-60}" y="{cy+40}" width="120" height="44" rx="8" fill="#dfe6ee" stroke="#9aa7b5" stroke-width="2"/>' + t(cx, cy + 67, '電池', 13, MUTED)
    for x in (cx - 40, cx + 40):
        s += f'<circle cx="{x}" cy="{cy-136}" r="8" fill="#ff5a4f"/><circle cx="{x}" cy="{cy-136}" r="14" fill="#ff5a4f" opacity=".2"/>'
    s += f'<rect x="{cx+60}" y="{cy+92}" width="20" height="10" rx="3" fill="#1e6fd9"/>'
    for i, lat in enumerate([-48, -24, 0, 24, 48]):
        s += f'<circle cx="{cx+lat}" cy="{cy-112}" r="5" fill="{PCB}" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 2"/>'
    s += f'<path d="M{cx} {cy-168} l-10 14 h20 z" fill="{BLUE}"/>' + t(cx, cy - 174, '車頭', 13, BLUE)
    labels = [
        (cx - 118, cy - 10, 210, cy - 10, '左輪及馬達'), (cx + 118, cy - 10, 550, cy - 10, '右輪及馬達'),
        (cx - 40, cy - 136, 210, 52, '前燈 LED'), (cx - 48, cy - 112, 210, 96, '巡線感應器（車底 5 個）'),
        (cx + 50, cy - 20, 550, 112, 'micro:bit（LED 面向前）'), (cx + 70, cy + 97, 550, 300, '電源開關'),
        (cx - 60, cy + 62, 210, 300, '電池'),
    ]
    for (x1, y1, x2, y2, lab) in labels:
        anchor = 'end' if x2 < cx else 'start'
        s += f'<line x1="{x1}" y1="{y1}" x2="{x2 + (8 if anchor=="end" else -8)}" y2="{y2}" stroke="{MUTED}" stroke-width="1.5"/>'
        s += f'<circle cx="{x1}" cy="{y1}" r="3" fill="{MUTED}"/>' + t(x2, y2 + 5, lab, 13.5, INK, anchor)
    s += t(W/2, H - 12, '示意圖（俯視）：老師可以換成自己小車的照片', 12, MUTED, weight=500)
    return svg(W, H, s, '小車各部分示意圖')

def car_under():
    W, H = 640, 300
    s = f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    cx, cy = 320, 160
    s += f'<rect x="{cx-200}" y="{cy-90}" width="400" height="190" rx="40" fill="#e8edf3" stroke="{INK}" stroke-width="3"/>'
    s += f'<rect x="{cx-230}" y="{cy-10}" width="30" height="90" rx="10" fill="#26323e"/><rect x="{cx+200}" y="{cy-10}" width="30" height="90" rx="10" fill="#26323e"/>'
    s += f'<rect x="{cx-150}" y="{cy-80}" width="300" height="60" rx="10" fill="{PCB}"/>'
    lats = [-110, -50, 0, 50, 110]
    for i, lat in enumerate(lats):
        s += f'<circle cx="{cx+lat}" cy="{cy-50}" r="13" fill="#1b1b1b" stroke="#bfe5cf" stroke-width="3"/><circle cx="{cx+lat}" cy="{cy-50}" r="4" fill="#ff5a4f"/>'
        s += t(cx + lat, cy - 2, ['L2', 'L1', 'M', 'R1', 'R2'][i], 16, INK, weight=800)
    s += f'<circle cx="{cx+170}" cy="{cy+50}" r="11" fill="#fff" stroke="{INK}" stroke-width="2"/>' + t(cx + 170, cy + 80, '校準按鈕', 12, MUTED)
    s += f'<path d="M{cx-150} {cy-102} H{cx+150}" stroke="{BLUE}" stroke-width="2"/>' + t(cx, cy - 108, '↑ 車頭方向（左右以「由上望」為準）', 12.5, BLUE, weight=700)
    s += f'<path d="M{cx-50} {cy+20} v16 h50 v-16" fill="none" stroke="{ORANGE}" stroke-width="2"/>' + t(cx - 25, cy + 52, 'L1 與 M 之間有距離', 12, ORANGE)
    return svg(W, H, s, '車底 5 路巡線感應器位置')

# ------------------------------------------------------------------ 加入擴展的步驟示意
def ext_steps():
    W, H = 720, 330
    p = 'ex'
    s = defs(p) + f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    # 視窗
    s += '<rect x="24" y="24" width="672" height="282" rx="12" fill="#fff" stroke="#c5d0dc" stroke-width="2"/><rect x="24" y="24" width="672" height="36" rx="12" fill="#5c2d91"/><rect x="24" y="48" width="672" height="12" fill="#5c2d91"/>'
    s += t(46, 47, 'MakeCode', 14, '#fff', 'start', 800)
    s += '<rect x="24" y="60" width="160" height="246" fill="#e9eef3"/>'
    s += '<rect x="196" y="60" width="150" height="246" fill="#f5f7fa"/>'
    cats = [('基本', '#1E90FF'), ('輸入', '#D400D4'), ('音樂', '#E63022'), ('LED', '#5C2D91'), ('迴圈', '#00AA00'), ('邏輯', '#00A4A6')]
    for i, (n, c) in enumerate(cats):
        s += f'<rect x="196" y="{72+i*28}" width="6" height="22" fill="{c}"/>' + t(212, 88 + i * 28, n, 12, INK, 'start', 600)
    s += f'<rect x="200" y="252" width="140" height="28" rx="6" fill="#fff" stroke="#9aa7b5"/>' + t(270, 271, '＋ 擴展', 13, INK)
    s += f'<circle cx="190" cy="266" r="13" fill="{ORANGE}"/>' + t(190, 271, '1', 13, '#fff')
    # 搜尋框
    s += '<rect x="372" y="84" width="300" height="34" rx="8" fill="#fff" stroke="#5c2d91" stroke-width="2"/>' + t(382, 106, 'github.com/DFRobot/pxt-DFRobot_MaqueenPlus_v20', 11, MUTED, 'start', 500)
    s += f'<circle cx="372" cy="84" r="13" fill="{ORANGE}"/>' + t(372, 89, '2', 13, '#fff')
    s += '<rect x="372" y="134" width="140" height="110" rx="10" fill="#fff" stroke="#c5d0dc" stroke-width="2"/><rect x="372" y="134" width="140" height="56" rx="10" fill="#e7f6ea"/>' + t(442, 168, 'maqueenPlusV2', 12, INK) + t(442, 216, '麥昆 Plus 擴展', 11, MUTED, weight=500)
    s += f'<circle cx="512" cy="140" r="13" fill="{ORANGE}"/>' + t(512, 145, '3', 13, '#fff')
    s += f'<path d="M530 200 h40" stroke="{INK}" stroke-width="3" marker-end="url(#{p}k)"/>'
    for i, (n, c) in enumerate([('IR', '#7a3fb0'), ('矩陣激光測距', '#e08600'), ('麥昆Plus V2&amp;V3', '#0FBC11')]):
        s += f'<rect x="582" y="{150+i*30}" width="6" height="22" fill="{c}"/>' + t(594, 166 + i * 30, n, 11.5, INK, 'start', 600)
    s += t(630, 250, '多了 3 組積木', 12, GREEN, weight=800)
    s += t(W/2, H - 4, '示意圖：實際畫面會隨 MakeCode 版本略有不同', 11, MUTED, weight=500)
    return svg(W, H, s, '加入 maqueenPlusV2 擴展的步驟')

# ------------------------------------------------------------------ 第 1 堂：正方形任務示意
def square_task():
    W, H = 520, 320
    p = 'sq'
    s = defs(p) + '<rect width="520" height="320" rx="16" fill="#ece6da"/>'
    for x in range(20, 520, 140): s += f'<line x1="{x}" y1="0" x2="{x}" y2="320" stroke="#d2c7b4" stroke-width="3"/>'
    for y in range(20, 320, 140): s += f'<line x1="0" y1="{y}" x2="520" y2="{y}" stroke="#d2c7b4" stroke-width="3"/>'
    s += '<rect x="160" y="160" width="140" height="140" fill="none" stroke="#1e6fd9" stroke-width="4" stroke-dasharray="12 8" transform="translate(0 -140)"/>'
    for (x1, y1, x2, y2) in [(160, 160, 160, 34), (160, 20, 286, 20), (300, 20, 300, 146), (300, 160, 174, 160)]:
        pass
    s += f'<path d="M160 150 V36" stroke="{BLUE}" stroke-width="4" marker-end="url(#{p}b)"/>'
    s += f'<path d="M172 20 H286" stroke="{BLUE}" stroke-width="4" marker-end="url(#{p}b)"/>'
    s += f'<path d="M300 32 V146" stroke="{BLUE}" stroke-width="4" marker-end="url(#{p}b)"/>'
    s += f'<path d="M288 160 H176" stroke="{BLUE}" stroke-width="4" marker-end="url(#{p}b)"/>'
    for (x, y, n) in [(160, 20, 1), (300, 20, 2), (300, 160, 3), (160, 160, 4)]:
        s += f'<circle cx="{x}" cy="{y}" r="12" fill="{ORANGE}"/>' + t(x, y + 5, f'{n}', 12, '#fff')
    s += '<g transform="translate(160 186)"><rect x="-18" y="-22" width="36" height="44" rx="8" fill="#fff" stroke="#2b3d52" stroke-width="2.5"/><rect x="-24" y="-8" width="7" height="18" rx="2" fill="#26323e"/><rect x="17" y="-8" width="7" height="18" rx="2" fill="#26323e"/><path d="M0 -18 l-5 7 h10 z" fill="#1e6fd9"/></g>'
    s += t(160, 238, '起點（車頭向上）', 13, INK)
    s += t(230, 98, '一格地磚', 13, MUTED) + t(230, 116, '（約 60 cm）', 12, MUTED, weight=500)
    s += t(420, 70, '直行一邊', 14, BLUE, weight=800) + t(420, 92, '＋ 原地轉 90°', 14, ORANGE, weight=800) + t(420, 118, '× 4 次', 18, INK, weight=900)
    return svg(W, H, s, '走一格地磚正方形')

# ------------------------------------------------------------------ 下載 → 測試 → 觀察 → 調整 循環
def dl_cycle():
    W, H = 760, 330
    p = 'dc'
    s = defs(p) + f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    cx, cy, rx, ry = 380, 168, 270, 110
    nodes = [('① 修改程式', '在 MakeCode 改數字', '#eef4fc', BLUE),
             ('② 下載', 'USB → micro:bit', '#eef4fc', BLUE),
             ('③ 測試', '拔線、放車、開電源', '#fff1e0', ORANGE),
             ('④ 觀察記錄', '邊長？轉角？', '#fff1e0', ORANGE),
             ('⑤ 決定調整', '每次只改一個數字', '#e9f8ee', GREEN)]
    pts = []
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    def edge(x, y, dx, dy, m=8):
        k = min(82 / abs(dx) if dx else 1e9, 32 / abs(dy) if dy else 1e9)
        L = math.hypot(dx, dy); return x + dx * k + dx / L * m, y + dy * k + dy / L * m
    for i in range(5):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % 5]
        dx, dy = x2 - x1, y2 - y1
        sx, sy = edge(x1, y1, dx, dy); ex, ey = edge(x2, y2, -dx, -dy, 12)
        mx, my = (sx + ex) / 2, (sy + ey) / 2; ox, oy = mx - cx, my - cy; L = math.hypot(ox, oy)
        qx, qy = mx + ox / L * 18, my + oy / L * 18
        col = GREEN if i == 4 else INK
        s += f'<path d="M{sx:.0f} {sy:.0f} Q{qx:.0f} {qy:.0f} {ex:.0f} {ey:.0f}" fill="none" stroke="{col}" stroke-width="3" marker-end="url(#{p}{"g" if i == 4 else "k"})"/>'
    for (x, y), (a, b, bg, st) in zip(pts, nodes):
        s += f'<rect x="{x-82:.0f}" y="{y-32:.0f}" width="164" height="64" rx="16" fill="{bg}" stroke="{st}" stroke-width="2.5"/>'
        s += t(x, y - 4, a, 17, st, weight=800) + t(x, y + 18, b, 12.5, INK, weight=500)
    s += t(cx, cy - 6, '不斷重複', 16, MUTED, weight=800) + t(cx, cy + 16, '直至走得準', 14, MUTED, weight=600)
    return svg(W, H, s, '修改、下載、測試、觀察、調整的循環')

# ------------------------------------------------------------------ 觀察：四種常見走法
def observe_panels():
    W, H = 760, 230
    p = 'ob'
    s = defs(p) + f'<rect width="{W}" height="{H}" rx="16" fill="{PAPER}"/>'
    cases = [('直行太短', 0.78, 90, '邊長要加長：直行暫停 ＋'), ('直行太長', 1.2, 90, '邊長要縮短：直行暫停 －'),
             ('轉得太少', 1.0, 78, '轉彎暫停 ＋（例如 +50 ms）'), ('轉得太多', 1.0, 102, '轉彎暫停 －（例如 −50 ms）')]
    for k, (title, f, ang, tip) in enumerate(cases):
        ox = 20 + k * 185; side = 74; x0, y0 = ox + 46, 160
        s += f'<rect x="{ox}" y="14" width="170" height="200" rx="12" fill="#fff" stroke="#d7e0ea"/>'
        s += f'<rect x="{x0}" y="{y0-side}" width="{side}" height="{side}" fill="none" stroke="#c9b99c" stroke-width="2" stroke-dasharray="6 5"/>'
        x, y, h = x0, y0, -90.0; pts = [(x, y)]
        for i in range(4):
            x += side * f * math.cos(math.radians(h)); y += side * f * math.sin(math.radians(h)); pts.append((x, y)); h += ang
        d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts)
        s += f'<path d="{d}" fill="none" stroke="{BLUE}" stroke-width="3" stroke-linejoin="round" marker-end="url(#{p}b)"/>'
        s += f'<circle cx="{x0}" cy="{y0}" r="6" fill="{ORANGE}"/>'
        s += t(ox + 85, 40, title, 16, RED if k else RED, weight=800)
        s += t(ox + 85, 202, tip, 11.5, INK, weight=600)
    return svg(W, H, s, '觀察小車走法：直行太短、直行太長、轉得太少、轉得太多')

# ------------------------------------------------------------------ 課堂頁標題插圖
def hero(n):
    W, H = 340, 220
    s = ''
    if n == 0:
        s += '<rect x="250" y="30" width="22" height="170" rx="4" fill="#fff" fill-opacity=".85"/>'
        for r in (40, 62, 84):
            s += f'<path d="M{150+r*0.2:.0f} {120-r} A{r} {r} 0 0 1 {150+r*0.2:.0f} {120+r}" transform="translate(40 0)" fill="none" stroke="#ffd166" stroke-width="4" stroke-linecap="round" opacity="{1.1-r/100:.2f}"/>'
        s += '<g transform="translate(120 120)"><circle r="58" fill="#fff" stroke="#14202b" stroke-width="3"/><circle r="40" fill="none" stroke="#c9d3de" stroke-width="2"/>'
        s += '<rect x="30" y="-14" width="22" height="28" rx="6" fill="#1f2a36"/><circle cx="-14" cy="-8" r="6" fill="#1f2a36"/><circle cx="14" cy="-8" r="6" fill="#1f2a36"/>'
        s += '<circle cx="-12" cy="-10" r="2" fill="#fff"/><circle cx="16" cy="-10" r="2" fill="#fff"/><path d="M-12 14 Q0 24 12 14" fill="none" stroke="#1f2a36" stroke-width="3" stroke-linecap="round"/></g>'
        return svg(W, H, s, '')
    if n == 1:
        s += '<rect x="10" y="20" width="320" height="190" rx="18" fill="#ffffff" opacity=".12"/>'
        for x in range(10, 340, 80): s += f'<line x1="{x}" y1="20" x2="{x}" y2="210" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>'
        for y in range(50, 220, 80): s += f'<line x1="10" y1="{y}" x2="330" y2="{y}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>'
        s += '<rect x="90" y="50" width="160" height="130" fill="none" stroke="#ffd166" stroke-width="4" stroke-dasharray="10 8" rx="4"/>'
    elif n == 2:
        s += '<path d="M30 190 C 80 60, 160 200, 210 90 S 300 40, 320 70" fill="none" stroke="#0d1b1f" stroke-width="16" stroke-linecap="round"/>'
        s += '<path d="M30 190 C 80 60, 160 200, 210 90 S 300 40, 320 70" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="40" stroke-linecap="round"/>'
    else:
        for i, (x, y, k) in enumerate([(60, 40, 'term'), (60, 96, 'dec'), (60, 160, 'proc')]):
            if k == 'term': s += f'<rect x="{x-38}" y="{y-14}" width="76" height="28" rx="14" fill="#fff" fill-opacity=".9"/>'
            elif k == 'dec': s += f'<polygon points="{x},{y-24} {x+44},{y} {x},{y+24} {x-44},{y}" fill="#ffd166"/>'
            else: s += f'<rect x="{x-40}" y="{y-16}" width="80" height="32" rx="6" fill="#fff" fill-opacity=".9"/>'
        s += '<path d="M60 54 V72 M60 120 V144" stroke="#fff" stroke-width="3"/><path d="M104 96 H150" stroke="#fff" stroke-width="3"/>'
        s += '<path d="M170 180 C 200 120, 240 160, 300 70" fill="none" stroke="#0d1020" stroke-width="14" stroke-linecap="round"/>'
    # 小車
    tx, ty, rot = {1: (90, 150, 0), 2: (204, 104, 30), 3: (262, 120, 40)}[n]
    s += f'<g transform="translate({tx} {ty}) rotate({rot})"><rect x="-30" y="-36" width="60" height="72" rx="14" fill="#fff" stroke="#14202b" stroke-width="3"/>'
    s += '<rect x="-42" y="-14" width="12" height="30" rx="4" fill="#14202b"/><rect x="30" y="-14" width="12" height="30" rx="4" fill="#14202b"/>'
    s += '<rect x="-16" y="-14" width="32" height="26" rx="4" fill="#1f2a36"/><circle cx="-12" cy="-28" r="4" fill="#ff5a4f"/><circle cx="12" cy="-28" r="4" fill="#ff5a4f"/>'
    s += '<path d="M0 -44 l-6 8 h12 z" fill="#ffd166"/></g>'
    return svg(W, H, s, '')

# ------------------------------------------------------------------ 寫檔
if __name__ == '__main__':
    files = {
        'q1-arm.svg': q1_arm(), 'q2-delivery.svg': q2_delivery(), 'q3-vacuum.svg': q3_vacuum(), 'q4-lift.svg': q4_lift(),
        'q5-door.svg': q5_door(), 'q6-rc.svg': q6_rc(), 'q7-fan.svg': q7_fan(), 'q8-claw.svg': q8_claw(), 'q9-ornament.svg': q9_ornament(),
        'ipo.svg': ipo(), 'sda-loop.svg': sda_loop(), 'ir-principle.svg': ir_principle(), 'car-top.svg': car_top(), 'car-under.svg': car_under(),
        'ext-steps.svg': ext_steps(), 'square-task.svg': square_task(), 'dl-cycle.svg': dl_cycle(), 'observe.svg': observe_panels(),
        'hero-l1.svg': hero(0), 'hero-l2.svg': hero(1), 'hero-l3.svg': hero(2), 'hero-l4.svg': hero(3),
    }
    for k, (label, body) in PARTS.items():
        files[k + '.svg'] = part(defs('pm') + body, label)
    for k, (label, o) in SURF.items():
        files[k + '.svg'] = scene(o, label)
    for name, c in files.items():
        save(name, c)
    print(len(files), 'files written to', OUT)
