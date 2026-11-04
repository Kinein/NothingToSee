#!/usr/bin/env python3
"""Object sheets: every thing in a building drawn on its own, from the four views the keys camera gives, one PNG each.

    python3 tools/object_sheets.py [building] [--out DIR] [--port N] [--no-open]

Builds the dev page, serves the repo on localhost and opens dist/nothing-to-see-here.dev.html#sheets=<building> in
your browser. The page (js/dev/object-sheets.js) draws a 2 x 2 sheet for every distinct object (furniture, what
hangs on the walls, doors) and posts them back here; they land in renders/<building>/ with an index.txt, and the
server stops. building: office (default), shop, apt, station: the `bld` of ROOMS in js/world/grid.js.
"""
import argparse, json, os, subprocess, sys, threading, webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ap = argparse.ArgumentParser()
ap.add_argument('building', nargs='?', default='office')
ap.add_argument('--out', help='where the PNGs go (default renders/<building>)')
ap.add_argument('--port', type=int, default=8770)
ap.add_argument('--no-open', action='store_true', help="don't open a browser: open the printed URL yourself")
args = ap.parse_args()
OUT = os.path.abspath(args.out or os.path.join(ROOT, 'renders', args.building))

subprocess.run([sys.executable, os.path.join(ROOT, 'build.py'), '--dev'], check=True, cwd=ROOT)
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.png'):
        os.remove(os.path.join(OUT, f))  # a sheet for something that's gone shouldn't linger


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')  # always the page just built
        super().end_headers()

    def do_POST(self):
        u = urlparse(self.path)
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if u.path == '/sheets/save':
            name = os.path.basename(parse_qs(u.query)['f'][0])
            with open(os.path.join(OUT, name), 'wb') as fh:
                fh.write(body)
            print('  ' + name)
        elif u.path == '/sheets/done':
            items = json.loads(body)
            with open(os.path.join(OUT, 'index.txt'), 'w') as fh:
                for it in items:
                    w, h, d = it['size']
                    fh.write(f"{it['file']:<34} {it['name']:<34} {w} x {h} x {d} m   {', '.join(it['where'])}\n")
            print(f'{len(items)} sheets in {OUT}')
            threading.Thread(target=srv.shutdown).start()
        self.send_response(204)
        self.end_headers()


srv = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
url = f'http://localhost:{args.port}/dist/nothing-to-see-here.dev.html#sheets={args.building}'
print('drawing at ' + url)
if not args.no_open:
    webbrowser.open(url)
srv.serve_forever()
