#!/usr/bin/env bash
set -u
# Preflight for Lenis SPA-style navigation; never used for the real server.
server() {
  python3 - <<'PY'
from http.server import BaseHTTPRequestHandler, HTTPServer
import os, urllib.parse

root = os.path.abspath('.')
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.unquote(self.path)
        if u in ('/', '/index.html'): u = '/index.html'
        fp = os.path.abspath(u)
        if not fp.startswith(root): self.send_error(403); return
        try:
            data = open(fp, 'rb').read()
        except Exception:
            self.send_error(404); return
        ext = os.path.splitext(fp)[1].lower()
        ctype = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}.get(ext, 'application/octet-stream')
        self.send_response(200); self.send_header('Content-Type', ctype); self.end_headers()
        self.wfile.write(data)
    def log_message(self, *a): pass

HTTPServer(('127.0.0.1', 4173), H).serve_forever()
PY
}
server &
SPID=$!
for i in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.2; done
atexit() { kill $SPID 2>/dev/null; }
trap atexit EXIT
