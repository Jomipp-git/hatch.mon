#!/usr/bin/env python3
"""Serve the project over HTTP for local testing. Never use file://.

  python3 tools/serveLocal.py              source tree, REAL Supabase project
  python3 tools/serveLocal.py --offline    source tree, no network at all
  python3 tools/serveLocal.py --dist       the staged build, REAL Supabase project
  python3 tools/serveLocal.py --lan        also reachable from a phone on the same network

Serving the source tree also reloads the open tab when a runtime file changes. The page polls
/__reload about once a second and reloads when the stamp moves, so a save shows up without touching
the browser and without a single dependency. The poll answers immediately and leaves a gap on
purpose: holding the request open would keep the page from ever reaching network idle, which is what
Playwright waits for. It is off under --dist: only the source tree reflects an edit that has not gone
through buildMobileRuntime.py, so reloading there would mislead.

Without --offline the page talks to the production Supabase project even on localhost: the
credentials live in authService.mjs, so logging in there is a real login and every save writes
the real row. --offline substitutes tools/devStubs/authService.mjs at request time, which has no
Supabase import and keeps the save row in localStorage. The substitution happens in this server
only; the file is never staged into dist/ and the deployed site cannot reach it.

Exists as a script because `python3 -m http.server` resolves its default directory from the
working directory at import time, which some launchers cannot provide.
"""
import argparse
import functools
import http.server
import os
import socketserver
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUBS = {'/authService.mjs': ROOT / 'tools/devStubs/authService.mjs'}
# Solo los ficheros que el navegador carga, no el arbol entero: `assets/pmd/` son 2.600 sprites y
# mirarles la fecha cada medio segundo seria tirar trabajo a la basura para vigilar lo que no cambia.
WATCHED = ('*.html', '*.js', '*.mjs')
EXTRA_WATCHED = ('assets/skins/themes.js', 'assets/pmd/manifest.js', 'assets/pmd/listMetrics.js')
POLL_SECONDS = .4

def watched_files():
    files = [path for pattern in WATCHED for path in ROOT.glob(pattern)]
    files += [ROOT / name for name in EXTRA_WATCHED]
    files += list((ROOT / 'vendor').glob('*.js'))
    return files

class Watcher:
    """Marca de tiempo que sube cuando algo cambia. Un hilo mira las fechas; las peticiones esperan."""

    def __init__(self):
        self.stamp = 0
        self.changed = threading.Condition()
        threading.Thread(target=self._loop, daemon=True).start()

    def _snapshot(self):
        marks = {}
        for path in watched_files():
            try:
                marks[str(path)] = path.stat().st_mtime_ns
            except OSError:
                continue
        return marks

    def _loop(self):
        previous = self._snapshot()
        while True:
            time.sleep(POLL_SECONDS)
            current = self._snapshot()
            if current == previous:
                continue
            previous = current
            with self.changed:
                self.stamp += 1
                self.changed.notify_all()

    def current(self):
        with self.changed:
            return self.stamp

class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    """Never let the browser reuse a response.

    Python's static handler only sends Last-Modified, and Chrome is free to guess a freshness
    window from it. Editing a runtime file and reloading then shows the previous build, which is
    the worst possible failure mode while checking a change by hand.
    """

    watcher = None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/__reload':
            self.serve_reload()
            return
        super().do_GET()

    def serve_reload(self):
        if self.watcher is None:
            self.send_error(404)
            return
        body = str(self.watcher.current()).encode()
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # La pestaña se cerro mientras la peticion estaba aparcada.

    def log_message(self, fmt, *args):
        # El sondeo largo son cientos de lineas que tapan lo que si importa.
        if self.path.startswith('/__reload'):
            return
        super().log_message(fmt, *args)

class OfflineHandler(NoStoreHandler):
    def send_head(self):
        stub = STUBS.get(self.path.split('?')[0])
        if stub is None:
            return super().send_head()
        body = stub.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'text/javascript')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        return __import__('io').BytesIO(body)

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--dist', action='store_true', help='serve dist/ instead of the source tree')
    parser.add_argument('--offline', action='store_true', help='stub auth and cloud saves; no network')
    parser.add_argument('--lan', action='store_true', help='bind every interface so a phone can reach it')
    args = parser.parse_args()
    if args.lan:
        args.bind = '0.0.0.0'
    directory = ROOT / 'dist' if args.dist else ROOT
    os.chdir(directory)
    base = OfflineHandler if args.offline else NoStoreHandler
    # Solo el arbol de fuentes refleja una edicion sin pasar por buildMobileRuntime.py; recargar
    # sirviendo dist/ enseñaria el build anterior y confundiria mas que ayudar.
    watcher = None if args.dist else Watcher()
    handler = functools.partial(type('Serving', (base,), {'watcher': watcher}), directory=str(directory))
    socketserver.TCPServer.allow_reuse_address = True
    # Con hilos porque el sondeo largo aparca la peticion: en un servidor de un solo hilo, la primera
    # pestaña abierta bloquearia a todas las demas.
    with socketserver.ThreadingTCPServer((args.bind, args.port), handler) as server:
        server.daemon_threads = True
        mode = 'OFFLINE (stubbed auth, localStorage saves)' if args.offline else 'LIVE Supabase project'
        reload_note = 'auto-reload on' if watcher else 'auto-reload off (--dist)'
        print(f'serving {directory.name}/ at http://{args.bind}:{args.port}/  ·  {mode}  ·  {reload_note}', flush=True)
        if args.lan:
            import socket
            probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                probe.connect(('192.0.2.1', 1))  # TEST-NET-1: routed nowhere, just reveals the local address
                print(f'reachable on this network at http://{probe.getsockname()[0]}:{args.port}/', flush=True)
            except OSError:
                print('could not determine the LAN address', flush=True)
            finally:
                probe.close()
        server.serve_forever()

if __name__ == '__main__':
    main()
