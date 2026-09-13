#!/usr/bin/env python3
"""Serve the project root over HTTP for local testing. Never use file://.

Exists because `python3 -m http.server` resolves its default directory from the working
directory at import time, which some launchers cannot provide.
"""
import argparse
import functools
import http.server
import os
import socketserver
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--dist', action='store_true', help='serve dist/ instead of the source tree')
    args = parser.parse_args()
    directory = ROOT / 'dist' if args.dist else ROOT
    os.chdir(directory)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((args.bind, args.port), handler) as server:
        print(f'serving {directory.name}/ at http://{args.bind}:{args.port}/', flush=True)
        server.serve_forever()

if __name__ == '__main__':
    main()
