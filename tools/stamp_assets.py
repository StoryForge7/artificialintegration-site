"""Rewrite ?v=<hash> cache-busters for /assets/ files from their current content.

Run from anywhere after editing CSS/JS:  python3 tools/stamp_assets.py
_headers serves /assets/* as immutable, so every change needs a new hash.
JS files are stamped first (ws.js imports orb.js), then every .html page.
"""
import hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'

def h(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]

# Matches "/assets/js/orb.js?v=abc" and relative "./orb.js?v=abc" inside JS.
REF = re.compile(r'((?:/assets/(?:css|js)/|\./)([\w.-]+\.(?:css|js)))\?v=[\w]+')

def stamp(file: pathlib.Path, base: pathlib.Path) -> bool:
    src = file.read_text()
    def sub(m):
        ref, name = m.group(1), m.group(2)
        target = (ASSETS / ref[len('/assets/'):]) if ref.startswith('/assets/') else (base / name)
        if not target.is_file():
            sys.exit(f'stamp: {file.relative_to(ROOT)} references missing {ref}')
        return f'{ref}?v={h(target)}'
    out = REF.sub(sub, src)
    if out != src:
        file.write_text(out)
        return True
    return False

changed = [f for f in sorted((ASSETS / 'js').glob('*.js')) if stamp(f, f.parent)]
changed += [f for f in sorted(ROOT.rglob('*.html')) if 'node_modules' not in f.parts and f.parts[len(ROOT.parts)] not in ('desk', 'workstation') and stamp(f, f.parent)]
for f in changed:
    print('stamped', f.relative_to(ROOT))
