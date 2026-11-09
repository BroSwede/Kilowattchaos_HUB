#!/usr/bin/env python3
"""Build the claude.ai artifact edition of the hub (a proof of concept people open from a claude.ai link).
Usage: python3 -I scripts/build-artifact.py OUT_DIR
Same screens as /hub. Data lives in the artifact's shared database (artifact/api.js) and sign-in is the
viewer's claude.ai account (artifact/gate.js). The robot loads the base64 parts already published on the
preview artifact, copied server-side at publish time."""
import json, os, re, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]
HUB = os.path.join(ROOT, 'public', 'hub')
if os.path.exists(OUT): shutil.rmtree(OUT)
shutil.copytree(HUB, OUT, ignore=shutil.ignore_patterns('model'))
for f in ('api.js', 'gate.js', 'gate.css', 'qrcode.js'):
    shutil.copy(os.path.join(ROOT, 'artifact', f), os.path.join(OUT, f))
# Absolute /hub/ paths become relative: the artifact serves its files next to the page.
for dp, _, fs in os.walk(OUT):
    for f in fs:
        if f.endswith(('.js', '.css')):
            p = os.path.join(dp, f); s = open(p).read()
            n = s.replace("'/hub/", "'").replace('"/hub/', '"').replace('`/hub/', '`').replace('(/hub/', '(')
            if n != s: open(p, 'w').write(n)
shell = open(os.path.join(ROOT, 'src', 'hub', 'shell.ts')).read()
SPRITE = json.loads(re.search(r'export const SPRITE = (".*?");\n', shell, re.S).group(1))
SHELL = json.loads(re.search(r'export const SHELL = (".*?");\n', shell, re.S).group(1)).replace('src="/hub/', 'src="')
page = open(os.path.join(ROOT, 'src', 'app', 'hub', 'page.tsx')).read()
CSS = re.findall(r"'([a-z-]+\.css)'", page.split('const CSS = [')[1].split('];')[0]) + ['gate.css', 'artifact.css']
layout = open(os.path.join(ROOT, 'src', 'app', 'layout.tsx')).read()
IMPORTS = re.search(r'imports: \{(.*?)\n  \},', layout, re.S).group(1)
imports = dict(re.findall(r"'?([\w/-]+)'?: '([^']+)'", IMPORTS))
parts = [f'assets/starterbot-f32.part{i:02d}.gz.txt' for i in range(1, 11)]
open(os.path.join(OUT, 'artifact.css'), 'w').write(""".fb-fab { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 80; height: 44px; padding: 0 18px; border: 0; border-radius: 999px; background: var(--solid); color: var(--on-solid); font: 500 14px/1 Inter, sans-serif; box-shadow: 0 12px 30px -10px rgba(0,0,0,.45); }
@media (max-width: 759px) { .fb-fab { height: 40px; padding: 0 14px; font-size: 13px; } }
""")
html = f"""<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}html{{scroll-padding-top:env(safe-area-inset-top,0px)}}body{{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}}img{{max-width:100%}}[hidden]:not([hidden=until-found i]){{display:none!important}}</style></head><body>
<title>Kilowattchaos Hub</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="color-scheme" content="light dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
{''.join(f'<link rel="stylesheet" href="{c}">' + chr(10) for c in CSS)}<script type="importmap">{json.dumps({'imports': imports})}</script>
<script src="qrcode.js"></script>
<script>window.KWC_MODEL = {json.dumps({'parts': parts, 'bytes': 143077460, 'base64': True})};</script>
{SPRITE}
{SHELL}
<div class="gate" id="gate"></div>
<script type="module" src="gate.js"></script>
</body></html>"""
open(os.path.join(OUT, 'index.html'), 'w').write(html)
print('built', OUT, sorted(os.listdir(OUT)))
