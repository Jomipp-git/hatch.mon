#!/usr/bin/env python3
"""Serve the project over HTTP for local testing. Never use file://.

  python3 tools/serveLocal.py              source tree, REAL Supabase project
  python3 tools/serveLocal.py --offline    source tree, no network at all
  python3 tools/serveLocal.py --dist       the staged build, REAL Supabase project

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
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUBS = {'/authService.mjs': ROOT / 'tools/devStubs/authService.mjs'}

class OfflineHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        stub = STUBS.get(self.path.split('?')[0])
        if stub is None:
            return super().send_head()
        body = stub.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'text/javascript')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        return __import__('io').BytesIO(body)

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--dist', action='store_true', help='serve dist/ instead of the source tree')
    parser.add_argument('--offline', action='store_true', help='stub auth and cloud saves; no network')
    args = parser.parse_args()
    directory = ROOT / 'dist' if args.dist else ROOT
    os.chdir(directory)
    base = OfflineHandler if args.offline else http.server.SimpleHTTPRequestHandler
    handler = functools.partial(base, directory=str(directory))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((args.bind, args.port), handler) as server:
        mode = 'OFFLINE (stubbed auth, localStorage saves)' if args.offline else 'LIVE Supabase project'
        print(f'serving {directory.name}/ at http://{args.bind}:{args.port}/  ·  {mode}', flush=True)
        server.serve_forever()

if __name__ == '__main__':
    main()
